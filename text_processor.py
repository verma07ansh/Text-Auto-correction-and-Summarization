import nltk
from nltk.tokenize import sent_tokenize
from transformers import (
    pipeline,
    BartForConditionalGeneration,
    BartTokenizer,
    AutoModelForSeq2SeqLM,
    AutoTokenizer
)
from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
from spellchecker import SpellChecker
from textblob import TextBlob
from googletrans import Translator
import re
import os
import torch

# Download required NLTK data
nltk.download('punkt')

app = Flask(__name__)
CORS(app)

class TextProcessor:
    def __init__(self):
        try:
            print("Loading models...")
            # Load spaCy
            try:
                self.nlp = spacy.load('en_core_web_sm')
            except OSError:
                os.system('python -m spacy download en_core_web_sm')
                self.nlp = spacy.load('en_core_web_sm')
            
            # Initialize spell checker
            self.spell = SpellChecker()
            
            # Initialize the models using pipeline for English correction
            self.grammar_corrector = pipeline(
                "text2text-generation",
                model="vennify/t5-base-grammar-correction",
                device="cpu"
            )
            
            # Initialize BART model for Hindi correction
            print("Loading BART model for Hindi correction...")
            self.bart_model = BartForConditionalGeneration.from_pretrained("facebook/bart-large")
            self.bart_tokenizer = BartTokenizer.from_pretrained("facebook/bart-large")
            
            # Initialize MT5 model for Hindi summarization
            print("Loading MT5 model for Hindi summarization...")
            self.mt5_model = AutoModelForSeq2SeqLM.from_pretrained("l3cube-pune/hindi-bart-summary")
            self.mt5_tokenizer = AutoTokenizer.from_pretrained("l3cube-pune/hindi-bart-summary")
            
            # Initialize Pegasus model for English summarization
            print("Loading Pegasus model for English summarization...")
            self.pegasus_model = AutoModelForSeq2SeqLM.from_pretrained("google/pegasus-large")
            self.pegasus_tokenizer = AutoTokenizer.from_pretrained("google/pegasus-large")
            
            # Initialize translator for Hindi
            self.translator = Translator()
            
            print("Models loaded successfully!")
            
        except Exception as e:
            print(f"Error initializing models: {str(e)}")
            raise

    def is_hindi(self, text):
        """Check if text contains Hindi characters"""
        hindi_pattern = re.compile(r'[\u0900-\u097F]+')
        return bool(hindi_pattern.search(text))

    def correct_english_text(self, text):
        """Correct English text using TextBlob and grammar correction"""
        try:
            # First use TextBlob for basic correction
            text = str(TextBlob(text).correct())
            
            # Then use grammar correction model
            sentences = sent_tokenize(text)
            corrected_sentences = []
            
            for sentence in sentences:
                input_text = f"grammar: {sentence}"
                result = self.grammar_corrector(
                    input_text,
                    max_length=512,
                    num_beams=5,
                    do_sample=False
                )[0]['generated_text']
                corrected_sentences.append(result)
            
            return ' '.join(corrected_sentences)
        except Exception as e:
            print(f"Error in English correction: {str(e)}")
            return text

    def correct_hindi_text(self, text):
        """Correct Hindi text using translation and BART"""
        try:
            # Translate to English
            translated = self.translator.translate(text, src="hi", dest="en")
            # Correct the English text using BART
            inputs = self.bart_tokenizer.encode(
                "correct: " + translated.text,
                return_tensors="pt",
                max_length=1024,
                truncation=True
            )
            corrected_ids = self.bart_model.generate(
                inputs,
                max_length=1024,
                min_length=30,
                length_penalty=2.0,
                num_beams=4,
                early_stopping=True
            )
            corrected_english = self.bart_tokenizer.decode(corrected_ids[0], skip_special_tokens=True)
            # Translate back to Hindi
            corrected_hindi = self.translator.translate(corrected_english, src="en", dest="hi").text
            return corrected_hindi
        except Exception as e:
            print(f"Error in Hindi correction: {str(e)}")
            return text

    def summarize_english(self, text):
        """Summarize English text using Pegasus"""
        try:
            # Prepare the input text
            inputs = self.pegasus_tokenizer(
                text,
                max_length=1024,
                truncation=True,
                padding="longest",
                return_tensors="pt"
            )
            
            # Generate summary
            summary_ids = self.pegasus_model.generate(
                inputs["input_ids"],
                max_length=150,
                min_length=30,
                length_penalty=2.0,
                num_beams=4,
                early_stopping=True
            )
            
            return self.pegasus_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        except Exception as e:
            print(f"Error in English summarization: {str(e)}")
            return text

    def summarize_hindi(self, text):
        """Summarize Hindi text using MT5"""
        try:
            # Prepare the input text
            inputs = self.mt5_tokenizer(
                text,
                max_length=1024,
                truncation=True,
                padding="longest",
                return_tensors="pt"
            )
            
            # Generate summary
            summary_ids = self.mt5_model.generate(
                inputs["input_ids"],
                max_length=150,
                min_length=30,
                length_penalty=2.0,
                num_beams=4,
                early_stopping=True
            )
            
            return self.mt5_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        except Exception as e:
            print(f"Error in Hindi summarization: {str(e)}")
            return text

    def process_text(self, text, mode='correct'):
        """Process text through the NLP pipeline."""
        try:
            is_hindi_text = self.is_hindi(text)
            
            if mode == 'correct':
                # Text correction based on language
                if is_hindi_text:
                    processed_text = self.correct_hindi_text(text)
                else:
                    processed_text = self.correct_english_text(text)
            else:  # summarize mode
                if is_hindi_text:
                    processed_text = self.summarize_hindi(text)
                else:
                    processed_text = self.summarize_english(text)
            
            return {
                'result': processed_text,
                'language': 'hindi' if is_hindi_text else 'english'
            }
            
        except Exception as e:
            print(f"Error in text processing: {str(e)}")
            return {
                'error': 'Failed to process text',
                'original_text': text
            }

# Initialize the processor
processor = TextProcessor()

@app.route('/process', methods=['POST'])
def process_text():
    try:
        data = request.json
        text = data.get('text', '')
        mode = data.get('mode', 'correct')
        
        if not text.strip():
            return jsonify({'error': 'No text provided'}), 400
            
        result = processor.process_text(text, mode)
        
        if 'error' in result:
            return jsonify(result), 500
            
        return jsonify(result)
        
    except Exception as e:
        print(f"Server error: {str(e)}")
        return jsonify({'error': 'Failed to process text'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
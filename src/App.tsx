import React, { useState } from 'react';
import { Languages, Sparkles, FileText, RefreshCw } from 'lucide-react';

type Language = 'en' | 'hi';

function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'correct' | 'summarize'>('correct');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const processText = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to process');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setOutputText('');
    setProgress(0);

    // Start progress simulation with slower increments
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 2; // Smaller increments for slower progress
      });
    }, 300); // Longer interval between updates

    try {
      const response = await fetch('http://localhost:5000/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          language,
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process text');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Set progress to 100% when processing is complete
      setProgress(100);
      setTimeout(() => {
        setOutputText(data.result);
        setIsProcessing(false);
        setProgress(0);
      }, 500);
    } catch (error) {
      console.error('Error:', error);
      setError('Error processing text. Please try again.');
      setIsProcessing(false);
      setProgress(0);
      clearInterval(progressInterval);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Languages className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Text Processor</h1>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative w-full sm:w-auto">
              <select
                className="w-full appearance-none px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-indigo-300 cursor-pointer pr-10"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                <option value="en">🇺🇸 English</option>
                <option value="hi">🇮🇳 Hindi</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative w-full sm:w-auto">
              <select
                className="w-full appearance-none px-4 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-indigo-300 cursor-pointer pr-10"
                value={mode}
                onChange={(e) => setMode(e.target.value as 'correct' | 'summarize')}
              >
                <option value="correct">✨ Auto-correct</option>
                <option value="summarize">📝 Summarize</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-700">Input Text</h2>
            </div>
            <textarea
              className="w-full h-40 p-4 rounded-lg border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-indigo-300 resize-none"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Enter your ${language === 'en' ? 'English' : 'Hindi'} text here...`}
            />
          </div>

          {/* Process Button and Loading Bar */}
          <div className="mb-6">
            <button
              className={`w-full py-3 px-6 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                isProcessing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg transform hover:-translate-y-0.5'
              }`}
              onClick={processText}
              disabled={isProcessing || !inputText.trim()}
            >
              {isProcessing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isProcessing ? 'Processing...' : 'Process Text'}
            </button>
            
            {/* Loading Progress Bar */}
            {isProcessing && (
              <div className="mt-6 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 font-medium">Processing</span>
                  <span className="text-sm text-gray-600 font-medium">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 animate-fade-in">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Output */}
          {outputText && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-700">Result</h2>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 border-2 border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{outputText}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
import { useState } from 'react';
import type { Route } from './+types/rfx';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'RFx Responses - SolutionHub' },
    { name: 'description', content: 'Generate RFP/RFI responses using AI' },
  ];
}

export default function RFx() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('https://seportal-api.arunpotta1024.workers.dev/api/rfx/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate response');
      }

      setResponse(data.response);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
  };

  const handleClear = () => {
    setQuestion('');
    setResponse('');
    setError('');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">RFx Response Generator</h1>
          <p className="text-gray-600">
            Generate professional RFP/RFI responses powered by AI and Cloudflare product documentation
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
              RFP/RFI Question
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Paste your RFP/RFI question here... (e.g., 'What DDoS protection capabilities does your platform offer?')"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading || !question.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating...' : 'Generate Response'}
            </button>
            <button
              onClick={handleClear}
              disabled={loading}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              Clear
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}
        </div>

        {response && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Generated Response</h2>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
              >
                Copy to Clipboard
              </button>
            </div>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {response}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Generating response...</span>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Paste your RFP/RFI question in the text area above</li>
            <li>• Click "Generate Response" to create an AI-powered answer</li>
            <li>• The response is based on Cloudflare's product documentation and best practices</li>
            <li>• Copy and customize the response for your RFP/RFI document</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

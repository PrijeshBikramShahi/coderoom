import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const createNewDocument = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.docId) {
        throw new Error('Invalid response from server');
      }

      router.push(`/editor/${data.docId}`);
    } catch (error) {
      console.error('Failed to create document:', error);
      setError(error instanceof Error ? error.message : 'Failed to create document. Please check if the backend server is running.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Real-Time Collaborative Editor
          </h1>
          <p className="text-xl text-gray-600">
            Create, share, and collaborate on code in real-time
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <button
            onClick={createNewDocument}
            disabled={loading}
            className="w-full py-4 px-6 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : (
              'Create New Document'
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Error:</strong> {error}
              <p className="text-sm mt-2">
                Make sure the backend server is running on port 3001.
                Run <code className="bg-red-200 px-1 rounded">npm run dev</code> in the backend directory.
              </p>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Features</h2>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Real-time synchronization across multiple users
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Custom Operational Transform for conflict resolution
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Automatic reconnection with state resync
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Live cursor tracking and presence awareness
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Optimistic updates with server validation
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Built with Next.js, TypeScript, WebSockets, and Zustand</p>
        </div>
      </div>
    </div>
  );
}

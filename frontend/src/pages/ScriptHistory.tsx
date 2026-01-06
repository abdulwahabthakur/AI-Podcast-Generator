import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

interface ScriptSummary {
  id: string;
  topic: string;
  duration_minutes: number;
  style: string;
  created_at: string;
  updated_at: string;
}

interface PodcastScriptLine {
  speaker: 'Host' | 'Guest';
  text: string;
  audioEffect?: string | null;
}

interface ScriptDetail extends ScriptSummary {
  script_data: PodcastScriptLine[];
}

/**
 * Page displaying user's saved podcast scripts
 * Allows viewing and deleting scripts
 */
function ScriptHistory() {
  const [scripts, setScripts] = useState<ScriptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScript, setSelectedScript] = useState<ScriptDetail | null>(null);
  const [viewingScript, setViewingScript] = useState(false);
  const { getAccessToken } = useAuth();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/scripts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch scripts');
      }

      const data = await response.json();
      setScripts(data.scripts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scripts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewScript = async (id: string) => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/scripts/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch script');
      }

      const script = await response.json();
      setSelectedScript(script);
      setViewingScript(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load script');
    }
  };

  const handleDeleteScript = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this script?')) {
      return;
    }

    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/scripts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete script');
      }

      // Remove from list
      setScripts(scripts.filter(s => s.id !== id));
      if (selectedScript?.id === id) {
        setSelectedScript(null);
        setViewingScript(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete script');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyScript = () => {
    if (!selectedScript) return;

    const scriptText = selectedScript.script_data
      .map((line) => `[${line.speaker}]: ${line.text}`)
      .join('\n\n');

    navigator.clipboard.writeText(scriptText).then(() => {
      alert('Script copied to clipboard!');
    });
  };

  const handleDownloadScript = () => {
    if (!selectedScript) return;

    const scriptText = selectedScript.script_data
      .map((line) => `[${line.speaker}]: ${line.text}`)
      .join('\n\n');

    const blob = new Blob([scriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `podcast-script-${selectedScript.topic.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (viewingScript && selectedScript) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setViewingScript(false)}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Back to History
            </button>
            <div className="flex space-x-2">
              <button
                onClick={handleCopyScript}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                Copy
              </button>
              <button
                onClick={handleDownloadScript}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Download
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedScript.topic}</h2>
            <div className="flex space-x-4 text-sm text-gray-600 mb-4">
              <span>Duration: {selectedScript.duration_minutes} minutes</span>
              <span>Style: {selectedScript.style}</span>
              <span>Created: {formatDate(selectedScript.created_at)}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {selectedScript.script_data.map((line, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    line.speaker === 'Host'
                      ? 'bg-primary-50 border-l-4 border-primary-500'
                      : 'bg-gray-50 border-l-4 border-gray-400'
                  }`}
                >
                  <div className="font-semibold text-sm text-gray-600 mb-1">
                    {line.speaker}
                    {line.audioEffect && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({line.audioEffect})
                      </span>
                    )}
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap">
                    {line.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Script History</h1>
            <p className="text-gray-600">View and manage your saved podcast scripts</p>
          </div>
          <Link
            to="/generate"
            className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 transition-colors font-medium"
          >
            Generate New
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading scripts...</p>
          </div>
        ) : scripts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No scripts yet</h2>
            <p className="text-gray-600 mb-6">Generate your first podcast script to get started</p>
            <Link
              to="/generate"
              className="inline-block bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 transition-colors font-medium"
            >
              Generate Script
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {scripts.map((script) => (
              <div
                key={script.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{script.topic}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center">
                        <span className="font-medium">Duration:</span>
                        <span className="ml-1">{script.duration_minutes} minutes</span>
                      </span>
                      <span className="flex items-center">
                        <span className="font-medium">Style:</span>
                        <span className="ml-1 capitalize">{script.style}</span>
                      </span>
                      <span className="flex items-center">
                        <span className="font-medium">Created:</span>
                        <span className="ml-1">{formatDate(script.created_at)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleViewScript(script.id)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteScript(script.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ScriptHistory;

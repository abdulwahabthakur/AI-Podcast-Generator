import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

interface PodcastScriptLine {
  speaker: 'Host' | 'Guest';
  text: string;
  audioEffect?: string | null;
}

const STYLE_OPTIONS = [
  { value: 'conversational', label: 'Conversational' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'investigative', label: 'Investigative' },
  { value: 'educational', label: 'Educational' },
  { value: 'storytelling', label: 'Storytelling' },
];

const MAX_DURATION = 30; // Maximum duration in minutes

/**
 * Main page for generating podcast scripts
 * Contains form to input topic, duration, and style
 * Displays generated audio player
 */
function PodcastGenerator() {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(20);
  const [style, setStyle] = useState('conversational');
  const [script, setScript] = useState<PodcastScriptLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duration > MAX_DURATION) {
      setError(`Duration cannot exceed ${MAX_DURATION} minutes.`);
      return;
    }

    setError(null);
    setLoading(true);
    setLoadingStep('Generating script...');
    setScript(null);
    setAudioUrl(null);

    try {
      const token = getAccessToken();
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // 1. Generate Script
      const response = await fetch(`${API_URL}/api/generate-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: topic.trim(),
          durationMinutes: duration,
          style: style,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      const data = await response.json();
      setScript(data.script);

      // 2. Generate Audio
      setLoadingStep('Generating audio (this may take a minute)...');
      
      const audioResponse = await fetch(`${API_URL}/api/generate-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ script: data.script }),
      });

      if (!audioResponse.ok) {
        const errorData = await audioResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error: ${audioResponse.status}`);
      }

      const audioBlob = await audioResponse.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate podcast');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleDownloadScript = () => {
    if (!script) return;

    const scriptText = script
      .map((line) => `[${line.speaker}]: ${line.text}`)
      .join('\n\n');

    const blob = new Blob([scriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `podcast-script-${topic.replace(/\s+/g, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Generate Podcast</h1>
          <p className="text-gray-600">Create AI-powered podcasts tailored to your topic and style</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                  Topic *
                </label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="e.g., Microplastics in drinking water"
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration: {duration} minutes
                </label>
                <input
                  id="duration"
                  type="range"
                  min="5"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  disabled={loading}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5 min</span>
                  <span>30 min</span>
                </div>
              </div>

              <div>
                <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
                  Style *
                </label>
                <select
                  id="style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
                >
                  {STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !topic.trim()}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {loadingStep}
                  </span>
                ) : (
                  'Generate Podcast'
                )}
              </button>
            </form>
          </div>

          {/* Player Section */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center justify-center min-h-[300px]">
            {audioUrl ? (
              <div className="w-full space-y-6 text-center">
                <div className="text-6xl mb-4">🎧</div>
                <h2 className="text-2xl font-bold text-gray-900">Your Podcast is Ready!</h2>
                <p className="text-gray-600">Listen to the generated episode about "{topic}"</p>
                
                <audio controls src={audioUrl} className="w-full" autoPlay />
                
                <div className="pt-4 border-t">
                  <button
                    onClick={handleDownloadScript}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                  >
                    Download Transcript
                  </button>
                </div>
              </div>
            ) : loading ? (
              <div className="text-center space-y-4">
                <div className="animate-pulse text-6xl">🎙️</div>
                <p className="text-lg font-medium text-gray-700">{loadingStep}</p>
                <p className="text-sm text-gray-500">Please wait while our AI researchers and hosts work on your episode.</p>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">✨</div>
                <p className="text-lg">Enter a topic and click Generate to create your podcast</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PodcastGenerator;

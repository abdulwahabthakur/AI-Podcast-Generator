export interface PodcastScriptLine {
  speaker: 'Host' | 'Guest';
  text: string;
  audioEffect?: string | null;
}

export interface GenerateScriptRequest {
  topic: string;
  durationMinutes: number;
  style: string;
}

/**
 * Calls the Python HTTP research service to generate a podcast script
 * The Python service should be running on PYTHON_SERVICE_URL (default: http://localhost:8000)
 */
export async function generatePodcastScript(
  request: GenerateScriptRequest
): Promise<PodcastScriptLine[]> {
  const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
  const endpoint = `${pythonServiceUrl}/generate`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error: ${response.status}`);
    }

    const script = await response.json();

    // Validate response format
    if (!Array.isArray(script)) {
      throw new Error('Invalid script format: expected array');
    }

    return script;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to generate script: ${error}`);
  }
}

export interface AudioGenerationRequest {
  script: Array<{
    speaker: 'Host' | 'Guest';
    text: string;
  }>;
}

/**
 * Generate audio from podcast script using ElevenLabs API
 * Combines all script lines into a single audio file
 */
export async function generateAudioFromScript(
  request: AudioGenerationRequest
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  // Default voice ID for host (you can customize this)
  const voiceId = process.env.ELEVENLABS_HOST_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel - default female

  // Combine all script text
  const allText = request.script
    .map((line) => line.text)
    .filter((text) => text.trim().length > 0)
    .join(' ');

  if (!allText.trim()) {
    throw new Error('Script is empty');
  }

  // Generate audio using ElevenLabs API
  const audioBlob = await generateSingleAudio(allText, voiceId, apiKey);

  // Convert blob to buffer
  const arrayBuffer = await audioBlob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate audio for a single text using ElevenLabs API
 */
async function generateSingleAudio(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<Blob> {
  const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return await response.blob();
}


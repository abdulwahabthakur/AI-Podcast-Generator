import { Router, Request, Response } from 'express';
import { generateAudioFromScript } from '../services/elevenlabsService';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting: max 5 audio generations per 15 minutes
const audioLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many audio generation requests, please try again later.'
});

/**
 * POST /api/generate-audio
 * Generate audio from an existing script
 * Requires authentication and script data in request body
 */
router.post('/', audioLimiter, async (req: Request, res: Response) => {
  try {
    const { script } = req.body;

    if (!script || !Array.isArray(script)) {
      res.status(400).json({ error: 'Script array is required' });
      return;
    }

    // Generate audio
    const audioBuffer = await generateAudioFromScript({ script });
    
    // Send audio as MP3 file
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="podcast.mp3"');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error generating audio:', error);
    
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to generate audio' });
    }
  }
});

export { router as generateAudioRouter };

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { generatePodcastScript } from '../services/pythonService';
import rateLimit from 'express-rate-limit';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials not found. Script saving will fail.');
}

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Rate limiting: max 10 requests per 15 minutes per IP
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many script generation requests, please try again later.'
});

/**
 * POST /api/generate-research
 * Generate a podcast script from topic, duration, and style
 * Requires authentication
 */
router.post('/', generateLimiter, async (req: Request, res: Response) => {
  try {
    const { topic, durationMinutes, style } = req.body;

    // Validate input
    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      res.status(400).json({ error: 'Topic is required and must be a non-empty string' });
      return;
    }

    if (!durationMinutes || typeof durationMinutes !== 'number' || durationMinutes < 5 || durationMinutes > 120) {
      res.status(400).json({ error: 'Duration must be a number between 5 and 120 minutes' });
      return;
    }

    if (!style || typeof style !== 'string') {
      res.status(400).json({ error: 'Style is required' });
      return;
    }

    const validStyles = ['conversational', 'documentary', 'investigative', 'educational', 'storytelling'];
    if (!validStyles.includes(style.toLowerCase())) {
      res.status(400).json({ error: `Style must be one of: ${validStyles.join(', ')}` });
      return;
    }

    // Generate script using Python service
    const script = await generatePodcastScript({
      topic: topic.trim(),
      durationMinutes,
      style: style.toLowerCase()
    });

    // Save script to database if Supabase is configured
    let savedScriptId = null;
    if (supabase && req.user) {
      try {
        const { data, error } = await supabase
          .from('scripts')
          .insert({
            user_id: req.user.id,
            topic: topic.trim(),
            duration_minutes: durationMinutes,
            style: style.toLowerCase(),
            script_data: script
          })
          .select('id')
          .single();

        if (!error && data) {
          savedScriptId = data.id;
        } else {
          console.error('Failed to save script:', error);
          // Don't fail the request if saving fails
        }
      } catch (dbError) {
        console.error('Database error while saving script:', dbError);
        // Continue without saving
      }
    }

    // Return script
    res.json({
      script,
      savedId: savedScriptId
    });
  } catch (error) {
    console.error('Error generating script:', error);
    
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to generate podcast script' });
    }
  }
});

export { router as generateResearchRouter };

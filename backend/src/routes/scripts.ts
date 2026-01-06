import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials not found. Script endpoints will fail.');
}

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * GET /api/scripts
 * Get all scripts for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!supabase || !req.user) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { data, error } = await supabase
      .from('scripts')
      .select('id, topic, duration_minutes, style, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Failed to fetch scripts' });
      return;
    }

    res.json({ scripts: data || [] });
  } catch (error) {
    console.error('Error fetching scripts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/scripts/:id
 * Get a specific script by ID
 * Verifies that the user owns the script
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!supabase || !req.user) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Script not found' });
      } else {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to fetch script' });
      }
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching script:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/scripts/:id
 * Delete a script by ID
 * Verifies that the user owns the script
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!supabase || !req.user) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { id } = req.params;

    // First verify the script exists and belongs to the user
    const { data: existingScript, error: fetchError } = await supabase
      .from('scripts')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !existingScript) {
      res.status(404).json({ error: 'Script not found' });
      return;
    }

    // Delete the script
    const { error: deleteError } = await supabase
      .from('scripts')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (deleteError) {
      console.error('Database error:', deleteError);
      res.status(500).json({ error: 'Failed to delete script' });
      return;
    }

    res.json({ message: 'Script deleted successfully' });
  } catch (error) {
    console.error('Error deleting script:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as scriptsRouter };

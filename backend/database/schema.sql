-- Podcast Generator Database Schema
-- Run this SQL in your Supabase SQL editor to create the scripts table

-- Create scripts table
CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  duration_minutes INT NOT NULL,
  style TEXT NOT NULL,
  script_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_created_at ON scripts(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own scripts
CREATE POLICY "Users can view own scripts"
  ON scripts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own scripts
CREATE POLICY "Users can insert own scripts"
  ON scripts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own scripts
CREATE POLICY "Users can update own scripts"
  ON scripts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own scripts
CREATE POLICY "Users can delete own scripts"
  ON scripts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_scripts_updated_at
  BEFORE UPDATE ON scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

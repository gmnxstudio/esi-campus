-- ============================================================
-- Add ai_plan JSONB column to tasks table
-- Optional: null if AI is not used
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS ai_plan JSONB DEFAULT NULL;

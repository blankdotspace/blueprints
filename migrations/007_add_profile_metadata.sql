-- Add metadata column to profiles table for flexible storage (tier, preferences, etc.)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

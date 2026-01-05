-- Add body column to resources table for rich text content
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS body TEXT;
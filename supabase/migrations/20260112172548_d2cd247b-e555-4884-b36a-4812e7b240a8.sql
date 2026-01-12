-- Add training_url column to tools table
ALTER TABLE public.tools 
ADD COLUMN training_url text DEFAULT NULL;
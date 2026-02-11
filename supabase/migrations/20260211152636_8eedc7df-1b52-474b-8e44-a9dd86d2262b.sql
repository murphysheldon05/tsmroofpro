
-- Add job_title field to profiles table for compliance officer identification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;

-- Add index for quick lookup
CREATE INDEX IF NOT EXISTS idx_profiles_job_title ON public.profiles(job_title) WHERE job_title IS NOT NULL;

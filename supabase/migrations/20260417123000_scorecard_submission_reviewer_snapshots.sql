-- Add reviewer display snapshots to hub-native scorecard submissions.
-- Keeps auth FK linkage while preserving display context from submission time.
ALTER TABLE public.scorecard_submissions
  ADD COLUMN IF NOT EXISTS reviewer_name_snapshot text,
  ADD COLUMN IF NOT EXISTS reviewer_email_snapshot text;

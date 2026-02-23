-- Rejected commission edit & resubmit flow
-- 1. was_rejected: persists once set so record never appears as "fresh"; visible in Tracker/admin for trend
-- 2. previous_submission_snapshot: stores prior values when rep resubmits so compliance can see changed fields

ALTER TABLE public.commission_submissions
  ADD COLUMN IF NOT EXISTS was_rejected boolean NOT NULL DEFAULT false;

ALTER TABLE public.commission_submissions
  ADD COLUMN IF NOT EXISTS previous_submission_snapshot jsonb;

COMMENT ON COLUMN public.commission_submissions.was_rejected IS 'Set true when compliance rejects; never cleared. Used for Rejected badge in Tracker/admin.';
COMMENT ON COLUMN public.commission_submissions.previous_submission_snapshot IS 'Snapshot of submission fields before last resubmit; used to highlight changed fields for compliance.';

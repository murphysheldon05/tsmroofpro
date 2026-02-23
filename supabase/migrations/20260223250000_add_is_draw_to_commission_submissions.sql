-- Add is_draw flag to commission_submissions so draw requests flow through same approval chain
ALTER TABLE public.commission_submissions
ADD COLUMN IF NOT EXISTS is_draw boolean DEFAULT false;

COMMENT ON COLUMN public.commission_submissions.is_draw IS 'True when this is a draw request (advance against future commission); flows through same approval chain as commissions.';

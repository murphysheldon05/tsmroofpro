
-- Phase 1: Warranty Tracker — Closed status, close gates, new fields

-- 1. Add new columns to warranty_requests
ALTER TABLE public.warranty_requests
  ADD COLUMN IF NOT EXISTS customer_notified_of_completion boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_date date,
  ADD COLUMN IF NOT EXISTS closed_by uuid;

-- 2. Add comment to document the new "closed" status value
-- (status is a text field, no enum constraint to update)
COMMENT ON COLUMN public.warranty_requests.customer_notified_of_completion IS 'Required = true before moving to Closed status';
COMMENT ON COLUMN public.warranty_requests.closed_date IS 'Auto-set when moved to Closed';
COMMENT ON COLUMN public.warranty_requests.closed_by IS 'User who moved to Closed';

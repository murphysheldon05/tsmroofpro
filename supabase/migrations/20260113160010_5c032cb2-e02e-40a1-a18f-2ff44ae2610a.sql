-- Add approval_stage column for dual-stage workflow (manager → accounting)
ALTER TABLE public.commission_submissions 
ADD COLUMN IF NOT EXISTS approval_stage TEXT DEFAULT 'pending_manager' 
CHECK (approval_stage IN ('pending_manager', 'manager_approved', 'accounting_approved'));

-- Add manager_approved fields
ALTER TABLE public.commission_submissions 
ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS manager_approved_by UUID;

-- Update existing pending_review submissions to have approval_stage
UPDATE public.commission_submissions 
SET approval_stage = 'pending_manager' 
WHERE status = 'pending_review' AND approval_stage IS NULL;

-- Update approved submissions to have proper stage
UPDATE public.commission_submissions 
SET approval_stage = 'accounting_approved' 
WHERE status = 'approved_for_payment' AND approval_stage IS NULL;

UPDATE public.commission_submissions 
SET approval_stage = 'accounting_approved' 
WHERE status = 'paid' AND approval_stage IS NULL;
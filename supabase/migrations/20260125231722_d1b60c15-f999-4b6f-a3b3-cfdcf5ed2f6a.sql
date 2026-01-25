-- Add new columns for governed commission workflow
-- Commission requested vs approved amounts
ALTER TABLE public.commission_submissions 
ADD COLUMN IF NOT EXISTS commission_requested numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_approved numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS commission_approved_by uuid,
ADD COLUMN IF NOT EXISTS revision_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_manager_submission boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS admin_approved_by uuid,
ADD COLUMN IF NOT EXISTS denied_at timestamptz,
ADD COLUMN IF NOT EXISTS denied_by uuid;

-- Create table for tracking denied job numbers (permanently locked)
CREATE TABLE IF NOT EXISTS public.denied_job_numbers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_number varchar(4) NOT NULL UNIQUE,
  commission_id uuid REFERENCES public.commission_submissions(id),
  denied_by uuid NOT NULL,
  denied_at timestamptz NOT NULL DEFAULT now(),
  denial_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.denied_job_numbers ENABLE ROW LEVEL SECURITY;

-- RLS policies for denied_job_numbers
CREATE POLICY "Authenticated users can view denied job numbers"
ON public.denied_job_numbers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Reviewers can insert denied job numbers"
ON public.denied_job_numbers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  public.is_commission_reviewer(auth.uid())
);

-- Create table for revision history with immutable audit trail
CREATE TABLE IF NOT EXISTS public.commission_revision_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_id uuid NOT NULL REFERENCES public.commission_submissions(id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  requested_by uuid NOT NULL,
  requested_by_name text,
  requested_by_role text,
  reason text NOT NULL,
  previous_amount numeric,
  new_amount numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_revision_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for commission_revision_log
CREATE POLICY "Submitters can view their own revision log"
ON public.commission_revision_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.commission_submissions cs
    WHERE cs.id = commission_revision_log.commission_id
    AND cs.submitted_by = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'admin') OR
  public.is_commission_reviewer(auth.uid())
);

CREATE POLICY "Reviewers can insert revision log entries"
ON public.commission_revision_log
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  public.is_commission_reviewer(auth.uid())
);

-- Create index for faster job number lookup
CREATE INDEX IF NOT EXISTS idx_denied_job_numbers_job_number ON public.denied_job_numbers(job_number);
CREATE INDEX IF NOT EXISTS idx_commission_revision_log_commission_id ON public.commission_revision_log(commission_id);
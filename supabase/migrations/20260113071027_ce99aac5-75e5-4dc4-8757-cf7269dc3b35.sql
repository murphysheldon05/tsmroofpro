-- Create commission submissions table with embedded worksheet data
CREATE TABLE public.commission_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL,
  submission_type TEXT NOT NULL DEFAULT 'employee' CHECK (submission_type IN ('employee', 'subcontractor')),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'revision_required', 'approved_for_payment', 'paid', 'on_hold')),
  
  -- Job Information
  job_name TEXT NOT NULL,
  job_address TEXT NOT NULL,
  acculynx_job_id TEXT,
  job_type TEXT NOT NULL CHECK (job_type IN ('insurance', 'retail', 'hoa')),
  roof_type TEXT NOT NULL CHECK (roof_type IN ('shingle', 'tile', 'flat', 'foam', 'other')),
  contract_date DATE NOT NULL,
  install_completion_date DATE,
  
  -- Sales Rep Info (for employee submissions)
  sales_rep_id UUID,
  sales_rep_name TEXT,
  rep_role TEXT CHECK (rep_role IN ('setter', 'closer', 'hybrid')),
  commission_tier TEXT CHECK (commission_tier IN ('15_40_60', '15_45_55', '15_50_50', 'custom')),
  custom_commission_percentage NUMERIC(5,2),
  
  -- Subcontractor Info (for subcontractor submissions)
  subcontractor_name TEXT,
  is_flat_fee BOOLEAN DEFAULT false,
  flat_fee_amount NUMERIC(12,2),
  
  -- Embedded Worksheet Data (stored as structured fields)
  contract_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplements_approved NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_job_revenue NUMERIC(12,2) GENERATED ALWAYS AS (contract_amount + supplements_approved) STORED,
  commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  gross_commission NUMERIC(12,2) GENERATED ALWAYS AS ((contract_amount + supplements_approved) * commission_percentage / 100) STORED,
  advances_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_commission_owed NUMERIC(12,2) GENERATED ALWAYS AS (
    CASE 
      WHEN is_flat_fee = true THEN COALESCE(flat_fee_amount, 0) - advances_paid
      ELSE ((contract_amount + supplements_approved) * commission_percentage / 100) - advances_paid
    END
  ) STORED,
  
  -- Workflow fields
  reviewer_notes TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  payout_batch_id UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create commission attachments table
CREATE TABLE public.commission_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES public.commission_submissions(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'supplement', 'invoice', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create commission status log for audit trail
CREATE TABLE public.commission_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES public.commission_submissions(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create commission reviewers table (who can approve/reject)
CREATE TABLE public.commission_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  user_name TEXT NOT NULL,
  can_approve BOOLEAN DEFAULT true,
  can_payout BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create sales reps lookup table for dropdown
CREATE TABLE public.sales_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.commission_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_reviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;

-- Function to check if user is a commission reviewer
CREATE OR REPLACE FUNCTION public.is_commission_reviewer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.commission_reviewers cr
    JOIN public.profiles p ON p.email = cr.user_email
    WHERE p.id = _user_id AND cr.is_active = true
  )
$$;

-- Function to check if user can do payouts
CREATE OR REPLACE FUNCTION public.can_process_payouts(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.commission_reviewers cr
    JOIN public.profiles p ON p.email = cr.user_email
    WHERE p.id = _user_id AND cr.is_active = true AND cr.can_payout = true
  )
$$;

-- RLS Policies for commission_submissions
CREATE POLICY "Users can insert their own submissions"
ON public.commission_submissions FOR INSERT
WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can view their own submissions"
ON public.commission_submissions FOR SELECT
USING (submitted_by = auth.uid());

CREATE POLICY "Reviewers can view all submissions"
ON public.commission_submissions FOR SELECT
USING (is_commission_reviewer(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reviewers can update submissions"
ON public.commission_submissions FOR UPDATE
USING (is_commission_reviewer(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for commission_attachments
CREATE POLICY "Users can upload attachments to their submissions"
ON public.commission_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.commission_submissions cs
    WHERE cs.id = commission_id AND cs.submitted_by = auth.uid()
  )
);

CREATE POLICY "Users can view attachments on accessible submissions"
ON public.commission_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.commission_submissions cs
    WHERE cs.id = commission_id 
    AND (cs.submitted_by = auth.uid() OR is_commission_reviewer(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Reviewers can delete attachments"
ON public.commission_attachments FOR DELETE
USING (is_commission_reviewer(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for commission_status_log
CREATE POLICY "Authenticated users can insert status logs"
ON public.commission_status_log FOR INSERT
WITH CHECK (auth.uid() = changed_by);

CREATE POLICY "Users can view logs for accessible submissions"
ON public.commission_status_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.commission_submissions cs
    WHERE cs.id = commission_id 
    AND (cs.submitted_by = auth.uid() OR is_commission_reviewer(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- RLS Policies for commission_reviewers (admin only)
CREATE POLICY "Admins can manage commission reviewers"
ON public.commission_reviewers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active reviewers"
ON public.commission_reviewers FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- RLS Policies for sales_reps
CREATE POLICY "Admins can manage sales reps"
ON public.sales_reps FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active sales reps"
ON public.sales_reps FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Create updated_at trigger for commission_submissions
CREATE TRIGGER update_commission_submissions_updated_at
BEFORE UPDATE ON public.commission_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for commission_reviewers
CREATE TRIGGER update_commission_reviewers_updated_at
BEFORE UPDATE ON public.commission_reviewers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for sales_reps
CREATE TRIGGER update_sales_reps_updated_at
BEFORE UPDATE ON public.sales_reps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for commission documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('commission-documents', 'commission-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for commission documents
CREATE POLICY "Users can upload commission documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'commission-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view commission documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'commission-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Reviewers can delete commission documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'commission-documents' AND (is_commission_reviewer(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)));
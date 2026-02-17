
-- Create commission_entries table for the Commission Tracker
CREATE TABLE public.commission_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_name TEXT NOT NULL,
  job TEXT,
  customer TEXT,
  approved_date DATE,
  job_value NUMERIC,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  paid_date DATE NOT NULL,
  check_type TEXT DEFAULT 'DIRECT DEPOSIT',
  notes TEXT,
  pay_type TEXT NOT NULL DEFAULT 'Commission',
  earned_comm NUMERIC,
  applied_bank NUMERIC,
  has_paid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add constraint for pay_type values
ALTER TABLE public.commission_entries
  ADD CONSTRAINT commission_entries_pay_type_check
  CHECK (pay_type IN ('Commission', 'Draw', 'Draw/Guarantee', 'Training Draw (NR)', 'Advance'));

-- Enable RLS
ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins have full access to commission_entries"
ON public.commission_entries
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Active employees can read (for shared views)
CREATE POLICY "Active employees can view commission_entries"
ON public.commission_entries
FOR SELECT
USING (public.is_active_employee(auth.uid()));


-- Create commission_documents table
CREATE TABLE public.commission_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name_id TEXT NOT NULL,
  job_date DATE NOT NULL,
  sales_rep TEXT NOT NULL,
  sales_rep_id UUID NULL,
  
  -- Financial inputs
  gross_contract_total NUMERIC NOT NULL DEFAULT 0,
  op_percent NUMERIC NOT NULL DEFAULT 0,
  contract_total_net NUMERIC NOT NULL DEFAULT 0,
  material_cost NUMERIC NOT NULL DEFAULT 0,
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  
  -- Negative expenses
  neg_exp_1 NUMERIC NOT NULL DEFAULT 0,
  neg_exp_2 NUMERIC NOT NULL DEFAULT 0,
  neg_exp_3 NUMERIC NOT NULL DEFAULT 0,
  supplement_fees_expense NUMERIC NOT NULL DEFAULT 0,
  
  -- Positive expenses
  pos_exp_1 NUMERIC NOT NULL DEFAULT 0,
  pos_exp_2 NUMERIC NOT NULL DEFAULT 0,
  pos_exp_3 NUMERIC NOT NULL DEFAULT 0,
  pos_exp_4 NUMERIC NOT NULL DEFAULT 0,
  
  -- Commission calculations
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  rep_commission NUMERIC NOT NULL DEFAULT 0,
  advance_total NUMERIC NOT NULL DEFAULT 0,
  company_profit NUMERIC NOT NULL DEFAULT 0,
  
  -- Claim supplement calculator (optional)
  starting_claim_amount NUMERIC NULL DEFAULT 0,
  final_claim_amount NUMERIC NULL DEFAULT 0,
  dollars_increased NUMERIC NULL DEFAULT 0,
  supplement_fee NUMERIC NULL DEFAULT 0,
  
  -- Notes and workflow
  notes TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Audit fields
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID NULL,
  approved_at TIMESTAMP WITH TIME ZONE NULL,
  approval_comment TEXT NULL
);

-- Enable RLS
ALTER TABLE public.commission_documents ENABLE ROW LEVEL SECURITY;

-- Creators can view and edit their own drafts
CREATE POLICY "Users can view own commission documents"
ON public.commission_documents
FOR SELECT
USING (
  created_by = auth.uid() 
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert own commission documents"
ON public.commission_documents
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own drafts"
ON public.commission_documents
FOR UPDATE
USING (
  (created_by = auth.uid() AND status = 'draft')
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete commission documents"
ON public.commission_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_commission_documents_updated_at
BEFORE UPDATE ON public.commission_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for common queries
CREATE INDEX idx_commission_documents_status ON public.commission_documents(status);
CREATE INDEX idx_commission_documents_created_by ON public.commission_documents(created_by);
CREATE INDEX idx_commission_documents_job_name ON public.commission_documents(job_name_id);

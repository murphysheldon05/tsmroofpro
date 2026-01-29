-- Add missing columns to commission_documents for the new form structure
ALTER TABLE public.commission_documents 
ADD COLUMN IF NOT EXISTS profit_split_label text DEFAULT '15/40/60',
ADD COLUMN IF NOT EXISTS rep_profit_percent numeric DEFAULT 0.40,
ADD COLUMN IF NOT EXISTS company_profit_percent numeric DEFAULT 0.60,
ADD COLUMN IF NOT EXISTS neg_exp_4 numeric DEFAULT 0;

-- Add a comment explaining the columns
COMMENT ON COLUMN public.commission_documents.profit_split_label IS 'Display label for the profit split option (e.g., 15/40/60)';
COMMENT ON COLUMN public.commission_documents.rep_profit_percent IS 'Sales rep profit percentage (e.g., 0.40 for 40%)';
COMMENT ON COLUMN public.commission_documents.company_profit_percent IS 'Company profit percentage (e.g., 0.60 for 60%)';
COMMENT ON COLUMN public.commission_documents.neg_exp_4 IS 'Fourth negative expense line (supplement fees)';
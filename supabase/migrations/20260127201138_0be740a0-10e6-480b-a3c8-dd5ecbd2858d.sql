-- Add scheduled_pay_date column to commission_documents table
-- This column stores the calculated Friday pay date when accounting approves

ALTER TABLE public.commission_documents
ADD COLUMN IF NOT EXISTS scheduled_pay_date date;

-- Add comment for documentation
COMMENT ON COLUMN public.commission_documents.scheduled_pay_date IS 'Calculated Friday pay date based on Wed 4 PM MST deadline rule';
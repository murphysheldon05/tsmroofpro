-- Add commission-specific columns to requests table
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS total_payout_requested DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add index for date-based queries (for bulk download)
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_type_status ON public.requests(type, status);
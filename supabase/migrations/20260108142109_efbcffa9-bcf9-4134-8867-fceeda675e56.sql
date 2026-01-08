-- Drop the existing check constraint
ALTER TABLE public.requests DROP CONSTRAINT IF EXISTS requests_status_check;

-- Add a new check constraint with all valid statuses
ALTER TABLE public.requests ADD CONSTRAINT requests_status_check 
CHECK (status IN ('pending', 'in_progress', 'approved', 'completed', 'rejected', 'closed'));
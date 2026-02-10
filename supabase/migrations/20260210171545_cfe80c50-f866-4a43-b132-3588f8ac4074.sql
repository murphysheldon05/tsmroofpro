
-- Add override tracking columns to commission_submissions
ALTER TABLE public.commission_submissions
ADD COLUMN IF NOT EXISTS override_amount numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS override_manager_id uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS override_commission_number integer DEFAULT NULL;

-- Add foreign key for override_manager_id
ALTER TABLE public.commission_submissions
ADD CONSTRAINT commission_submissions_override_manager_id_fkey
FOREIGN KEY (override_manager_id) REFERENCES public.profiles(id);

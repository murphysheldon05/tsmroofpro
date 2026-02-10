
-- Add job_number, reason, commission_id, paid_off_at to draws table
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS job_number text;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS commission_id uuid;
ALTER TABLE public.draws ADD COLUMN IF NOT EXISTS paid_off_at timestamptz;

-- Make job_number required for new draws (existing rows may be null)
-- We won't add NOT NULL constraint to avoid breaking existing data

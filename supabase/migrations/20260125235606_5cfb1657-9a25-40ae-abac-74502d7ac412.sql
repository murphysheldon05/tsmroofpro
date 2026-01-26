-- Create enum for SOP status
CREATE TYPE public.sop_status AS ENUM ('draft', 'live', 'archived');

-- Add status column to resources table with default 'live' for existing SOPs
ALTER TABLE public.resources 
ADD COLUMN status public.sop_status NOT NULL DEFAULT 'live';

-- Add published_at and archived_at tracking columns
ALTER TABLE public.resources 
ADD COLUMN published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN published_by UUID,
ADD COLUMN archived_by UUID;

-- Update existing SOPs to have published_at set to their created_at
UPDATE public.resources SET published_at = created_at WHERE status = 'live';

-- Create index for faster status filtering
CREATE INDEX idx_resources_status ON public.resources(status);

-- Add comment for documentation
COMMENT ON COLUMN public.resources.status IS 'SOP lifecycle status: draft (not visible to reps), live (visible to all), archived (admin only)';
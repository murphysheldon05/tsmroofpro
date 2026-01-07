-- Add approval status to profiles
ALTER TABLE public.profiles 
ADD COLUMN is_approved BOOLEAN DEFAULT false,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN approved_by UUID;

-- Update existing users to be approved (they're already in the system)
UPDATE public.profiles SET is_approved = true WHERE id IS NOT NULL;

-- Create index for quick lookup of pending approvals
CREATE INDEX idx_profiles_pending_approval ON public.profiles(is_approved) WHERE is_approved = false;
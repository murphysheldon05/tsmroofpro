-- Create pending_invites table to track invited emails
CREATE TABLE public.pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  link_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invites
CREATE POLICY "Admins can manage pending invites"
  ON public.pending_invites
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can check if their email is invited (for signup validation)
CREATE POLICY "Anyone can check if email is invited"
  ON public.pending_invites
  FOR SELECT
  USING (true);

-- Add commission_tier_id to profiles for tier assignment
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commission_tier_id UUID REFERENCES public.commission_tiers(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_pending_invites_email ON public.pending_invites(email);
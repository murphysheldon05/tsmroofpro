-- Create table for individual SOP acknowledgments (per-SOP tracking)
CREATE TABLE IF NOT EXISTS public.master_sop_acknowledgments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sop_number INTEGER NOT NULL CHECK (sop_number >= 1 AND sop_number <= 10),
    sop_version TEXT NOT NULL,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, sop_number, sop_version)
);

-- Enable RLS
ALTER TABLE public.master_sop_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Users can view their own acknowledgments
CREATE POLICY "Users can view own acknowledgments"
ON public.master_sop_acknowledgments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own acknowledgments
CREATE POLICY "Users can insert own acknowledgments"
ON public.master_sop_acknowledgments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin can view all acknowledgments
CREATE POLICY "Admins can view all acknowledgments"
ON public.master_sop_acknowledgments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Create index for fast lookups
CREATE INDEX idx_master_sop_ack_user_version 
ON public.master_sop_acknowledgments(user_id, sop_version);

-- Add category for Master Playbook if it doesn't exist
INSERT INTO public.categories (name, slug, description, sort_order, icon)
VALUES (
    'Master Playbook',
    'master-playbook',
    'Core operational SOPs - Required reading for all team members',
    0,
    'book-open'
)
ON CONFLICT (slug) DO NOTHING;
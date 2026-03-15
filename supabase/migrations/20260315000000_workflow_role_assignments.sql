-- Create workflow_role_assignments table for admin-configurable workflow reviewers
CREATE TABLE IF NOT EXISTS public.workflow_role_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key text NOT NULL UNIQUE,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Seed the two workflow roles
INSERT INTO public.workflow_role_assignments (role_key) VALUES
  ('compliance_reviewer'),
  ('accounting_reviewer')
ON CONFLICT (role_key) DO NOTHING;

-- RLS: admin-only
ALTER TABLE public.workflow_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read workflow_role_assignments"
  ON public.workflow_role_assignments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update workflow_role_assignments"
  ON public.workflow_role_assignments FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Service role needs full access for edge functions
CREATE POLICY "Service role full access on workflow_role_assignments"
  ON public.workflow_role_assignments FOR SELECT
  USING (auth.role() = 'service_role');

-- Clear all existing test commission data (keep schema intact)
DELETE FROM public.commission_status_log;
DELETE FROM public.commission_attachments;
DELETE FROM public.commission_revision_log;
DELETE FROM public.commission_entries;
DELETE FROM public.draw_applications;
DELETE FROM public.draw_requests;
DELETE FROM public.draws;
DELETE FROM public.commission_submissions;
DELETE FROM public.commission_documents;

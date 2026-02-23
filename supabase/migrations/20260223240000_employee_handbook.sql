-- Employee Handbook: versioned PDF upload (admin-only), required acknowledgment for all users.
-- When a new version is uploaded, all users must acknowledge before continuing to use the app.

-- Versions: one row per upload; "current" = latest by uploaded_at
CREATE TABLE public.employee_handbook_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.employee_handbook_versions ENABLE ROW LEVEL SECURITY;

-- Everyone can read versions (to show current and display PDF)
CREATE POLICY "Authenticated can view handbook versions"
  ON public.employee_handbook_versions FOR SELECT TO authenticated USING (true);

-- Only admins can insert new versions
CREATE POLICY "Admins can insert handbook versions"
  ON public.employee_handbook_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Acknowledgments: user, version, timestamp (name comes from profiles at report time)
CREATE TABLE public.employee_handbook_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handbook_version_id UUID NOT NULL REFERENCES public.employee_handbook_versions(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, handbook_version_id)
);

ALTER TABLE public.employee_handbook_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Users can view their own acknowledgments
CREATE POLICY "Users can view own handbook acknowledgments"
  ON public.employee_handbook_acknowledgments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own acknowledgment (when they acknowledge)
CREATE POLICY "Users can insert own handbook acknowledgment"
  ON public.employee_handbook_acknowledgments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all acknowledgments (for report)
CREATE POLICY "Admins can view all handbook acknowledgments"
  ON public.employee_handbook_acknowledgments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_handbook_ack_user ON public.employee_handbook_acknowledgments(user_id);
CREATE INDEX idx_handbook_ack_version ON public.employee_handbook_acknowledgments(handbook_version_id);

-- Storage bucket for employee handbook PDFs (admin upload, all authenticated read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-handbook', 'employee-handbook', false)
ON CONFLICT (id) DO NOTHING;

-- Only admins can upload to employee-handbook bucket
CREATE POLICY "Admins can upload employee handbook"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employee-handbook'
    AND public.has_role(auth.uid(), 'admin')
  );

-- All authenticated users can read (so everyone can view the current PDF)
CREATE POLICY "Authenticated can read employee handbook"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'employee-handbook');

-- Admins can update/delete (replace or remove handbook file)
CREATE POLICY "Admins can update employee handbook"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'employee-handbook' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete employee handbook"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'employee-handbook' AND public.has_role(auth.uid(), 'admin'));

-- Category for Playbook Library UI (optional; we use a dedicated page, but slug for nav)
INSERT INTO public.categories (name, slug, description, sort_order, icon)
VALUES (
  'Employee Handbook',
  'employee-handbook',
  'Company employee handbook – required reading; all users must acknowledge the current version.',
  -1,
  'book-open'
)
ON CONFLICT (slug) DO NOTHING;

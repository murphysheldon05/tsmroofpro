-- Storage buckets: handbooks (Employee Handbook) and message-center-images (Message Center)
-- Idempotent: safe to re-run.

-- Bucket column for employee_handbook_versions: legacy rows use employee-handbook, new use handbooks
ALTER TABLE public.employee_handbook_versions
  ADD COLUMN IF NOT EXISTS bucket text NOT NULL DEFAULT 'handbooks';

-- Existing rows (created before this migration) used employee-handbook bucket
UPDATE public.employee_handbook_versions SET bucket = 'employee-handbook';

-- =============================================================================
-- 1. HANDBOOKS BUCKET (Employee Handbook)
-- Admins upload, all authenticated users can read/download
-- PDF uploads only (enforced in app)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('handbooks', 'handbooks', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies for handbooks if any (for idempotency)
DROP POLICY IF EXISTS "Admins can upload handbooks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read handbooks" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update handbooks" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete handbooks" ON storage.objects;

-- Only admins can upload to handbooks bucket
CREATE POLICY "Admins can upload handbooks"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'handbooks'
    AND public.has_role(auth.uid(), 'admin')
  );

-- All authenticated users can read (view/download PDF)
CREATE POLICY "Authenticated can read handbooks"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'handbooks');

-- Admins can update/delete (replace or remove handbook file)
CREATE POLICY "Admins can update handbooks"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'handbooks' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete handbooks"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'handbooks' AND public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- 2. MESSAGE-CENTER-IMAGES BUCKET
-- All authenticated users can upload their own images, all can read
-- Images stored under {user_id}/{filename}
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('message-center-images', 'message-center-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies for message-center-images if any (for idempotency)
DROP POLICY IF EXISTS "Public read message center images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own message center images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own message center images" ON storage.objects;

-- All can read (public bucket - images display inline in feed)
CREATE POLICY "Public read message center images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'message-center-images');

-- Users can upload only to their own folder: message-center-images/{user_id}/*
CREATE POLICY "Users can upload own message center images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-center-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own images
CREATE POLICY "Users can delete own message center images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'message-center-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

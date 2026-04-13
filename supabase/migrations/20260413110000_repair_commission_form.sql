-- Repair Commission Form
-- Adds form_type discriminator and repair-specific columns to commission_documents

ALTER TABLE commission_documents
  ADD COLUMN IF NOT EXISTS form_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (form_type IN ('standard', 'repair'));

ALTER TABLE commission_documents
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS repair_description TEXT,
  ADD COLUMN IF NOT EXISTS repair_date DATE,
  ADD COLUMN IF NOT EXISTS total_repair_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS repair_commission_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS repair_commission_rate NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS repair_photos TEXT[];

CREATE INDEX IF NOT EXISTS idx_commission_documents_form_type ON commission_documents(form_type);

-- Storage bucket for repair photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('repair-photos', 'repair-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to their own folder
CREATE POLICY "users_upload_repair_photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'repair-photos');

CREATE POLICY "users_read_repair_photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'repair-photos');

CREATE POLICY "admin_delete_repair_photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'repair-photos'
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

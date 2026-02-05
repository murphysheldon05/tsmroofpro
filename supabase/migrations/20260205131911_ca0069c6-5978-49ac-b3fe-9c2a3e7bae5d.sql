-- 1. Add admin-only visibility flag to profiles table
-- When TRUE, this user's commission documents are ONLY visible to admins and accounting
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS commission_admin_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.commission_admin_only IS 
  'When true, this user''s commission docs are only visible to admin/accounting roles, not managers';

-- 2. Add review-request fields to commission_documents table
ALTER TABLE commission_documents 
ADD COLUMN IF NOT EXISTS review_requested_by text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS review_requested_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS review_requested_to text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS review_requested_to_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS review_notes text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS review_completed_by text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS review_completed_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS review_completed_notes text DEFAULT NULL;

COMMENT ON COLUMN commission_documents.review_requested_to IS 
  'User ID of the admin/manager that accounting is requesting to review this document';
COMMENT ON COLUMN commission_documents.review_requested_to_name IS 
  'Display name of the reviewer for UI convenience';
-- Add document_type to user_files to categorize files
ALTER TABLE public.user_files 
ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'personal';

-- Add document_url to sop_acknowledgments to store the PDF path
ALTER TABLE public.sop_acknowledgments 
ADD COLUMN IF NOT EXISTS document_url text;

-- Add signature_data to store digital signature (base64 or text representation)
ALTER TABLE public.sop_acknowledgments 
ADD COLUMN IF NOT EXISTS signature_data text;

-- Add full_name at time of signing for the document
ALTER TABLE public.sop_acknowledgments 
ADD COLUMN IF NOT EXISTS signed_name text;

-- Create index for faster lookups by document type
CREATE INDEX IF NOT EXISTS idx_user_files_document_type ON public.user_files(user_id, document_type);
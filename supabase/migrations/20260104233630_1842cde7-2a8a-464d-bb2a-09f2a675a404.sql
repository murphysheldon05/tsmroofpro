-- Add file_path column to requests table for document attachments
ALTER TABLE public.requests 
ADD COLUMN file_path text;

-- Create storage bucket for request attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for request attachments
-- Users can upload their own attachments
CREATE POLICY "Users can upload request attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'request-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own attachments, managers/admins can view all
CREATE POLICY "Users can view request attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'request-attachments' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'manager')
    OR has_role(auth.uid(), 'admin')
  )
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete own request attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'request-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
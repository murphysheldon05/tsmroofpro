-- Create storage bucket for onboarding SOP documents
INSERT INTO storage.buckets (id, name, public) VALUES ('onboarding-sops', 'onboarding-sops', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for onboarding SOPs
CREATE POLICY "Authenticated users can read onboarding SOPs"
ON storage.objects FOR SELECT
USING (bucket_id = 'onboarding-sops' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can upload onboarding SOPs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'onboarding-sops' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update onboarding SOPs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'onboarding-sops' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete onboarding SOPs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'onboarding-sops' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Add document_url column to role_onboarding_sops for linking to stored documents
ALTER TABLE public.role_onboarding_sops 
ADD COLUMN IF NOT EXISTS document_url text;

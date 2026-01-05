-- Create storage bucket for video thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-thumbnails', 'video-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload thumbnails
CREATE POLICY "Authenticated users can upload video thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'video-thumbnails');

-- Allow public access to view thumbnails
CREATE POLICY "Anyone can view video thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'video-thumbnails');

-- Allow authenticated users to delete their uploaded thumbnails
CREATE POLICY "Authenticated users can delete video thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'video-thumbnails');
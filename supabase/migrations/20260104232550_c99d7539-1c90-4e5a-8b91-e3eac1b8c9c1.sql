-- Create storage bucket for resource documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-documents', 'resource-documents', false);

-- Policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resource-documents');

-- Policy: Users can view documents based on resource visibility
-- First create a helper function to check if user can access a resource's file
CREATE OR REPLACE FUNCTION public.can_access_resource_file(file_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resource_visibility app_role;
  user_role app_role;
BEGIN
  -- Extract the resource file path and find matching resource
  SELECT visibility INTO resource_visibility
  FROM resources
  WHERE resources.file_path = file_path
  LIMIT 1;
  
  -- If no matching resource found, deny access
  IF resource_visibility IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user's role
  SELECT get_user_role(auth.uid()) INTO user_role;
  
  -- Check access based on visibility
  RETURN CASE resource_visibility
    WHEN 'employee' THEN true
    WHEN 'manager' THEN user_role IN ('manager', 'admin')
    WHEN 'admin' THEN user_role = 'admin'
    ELSE false
  END;
END;
$$;

-- Policy: Users can view files based on resource visibility
CREATE POLICY "Users can view documents based on resource visibility"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resource-documents' 
  AND public.can_access_resource_file(name)
);

-- Policy: Admins and managers can update documents
CREATE POLICY "Admins and managers can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resource-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
);

-- Policy: Admins can delete documents
CREATE POLICY "Admins can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resource-documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
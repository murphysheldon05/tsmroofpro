-- Drop and recreate the admin delete policy
DROP POLICY IF EXISTS "Admins can delete commission documents" ON public.commission_documents;

CREATE POLICY "Admins can delete commission documents"
ON public.commission_documents FOR DELETE
TO authenticated
USING (
  is_active_employee(auth.uid()) AND 
  has_role(auth.uid(), 'admin'::app_role)
);
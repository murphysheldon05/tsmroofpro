-- Allow Accounting department users to view all commission documents
CREATE POLICY "Accounting can view all commission documents"
ON public.commission_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.department IN ('Accounting', 'Admin')
  )
);
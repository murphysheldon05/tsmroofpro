-- Fix: Add missing INSERT policy for warranty_requests
-- Root cause: Only admins/managers could insert (via FOR ALL policy).
-- All other authenticated users (sales_rep, sales_manager, user) were blocked.
-- The created_by column ensures ownership tracking regardless of who inserts.

CREATE POLICY "Authenticated users can create warranty requests"
ON public.warranty_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
);

-- Also add a DELETE policy for admins (was missing, only covered by FOR ALL)
-- This is a safety net in case the FOR ALL policy is ever changed.
CREATE POLICY "Admins can delete warranty requests"
ON public.warranty_requests
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
);

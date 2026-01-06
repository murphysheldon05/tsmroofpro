-- Add explicit policy to prevent employees from updating requests
-- This ensures only admins/managers can update requests (status changes, approvals, etc.)
-- and regular users cannot modify their submitted requests

-- First, let's verify the existing UPDATE policy only covers admins/managers
-- The current policy "Admins can manage requests" already restricts UPDATE to admins/managers
-- But we should add an explicit DENY-style policy for clarity and security

-- Actually, since there's already an UPDATE policy that only allows admins/managers,
-- and PostgreSQL RLS is "deny by default" when policies exist, employees are already blocked.
-- However, to be explicit and clear, we can add a comment or ensure the policy is correct.

-- The existing policy is:
-- CREATE POLICY "Admins can manage requests" ON public.requests FOR UPDATE
-- USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))

-- Since RLS is already enabled and the only UPDATE policy requires admin/manager role,
-- employees cannot update requests. But let's verify by adding an explicit policy name
-- that makes this security intention crystal clear.

-- We'll rename the existing policy to be more descriptive
DROP POLICY IF EXISTS "Admins can manage requests" ON public.requests;

CREATE POLICY "Only admins and managers can update requests" 
ON public.requests 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
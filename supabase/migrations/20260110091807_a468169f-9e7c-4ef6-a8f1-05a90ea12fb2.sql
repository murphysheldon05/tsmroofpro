-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Managers and admins can view new hires" ON public.new_hires;

-- Create more restrictive policies:
-- Admins can view all new hires
CREATE POLICY "Admins can view all new hires"
ON public.new_hires
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can only view new hires they submitted
CREATE POLICY "Managers can view own submitted new hires"
ON public.new_hires
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND submitted_by = auth.uid()
);
-- Drop the existing manager SELECT policy
DROP POLICY IF EXISTS "Managers can view own submitted new hires" ON public.new_hires;

-- Create a new policy that restricts manager access to only pending new hires they submitted
-- Once a new hire is processed (status != 'pending'), managers lose access
CREATE POLICY "Managers can view own pending new hires"
ON public.new_hires
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND submitted_by = auth.uid()
  AND status = 'pending'
);
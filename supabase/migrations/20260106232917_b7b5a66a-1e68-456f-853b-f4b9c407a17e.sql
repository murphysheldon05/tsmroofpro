-- Update user_roles table RLS policy to restrict viewing
-- Users can only see their own role, admins and managers can see all

DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

CREATE POLICY "Users can view roles based on permission" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);
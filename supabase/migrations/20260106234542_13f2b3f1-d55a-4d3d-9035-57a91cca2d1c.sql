-- Update user_roles table RLS policy to restrict visibility
-- Only admins can see all roles, regular users can only see their own role

DROP POLICY IF EXISTS "Users can view roles based on permission" ON public.user_roles;

CREATE POLICY "Users can view own role or admins can view all" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);
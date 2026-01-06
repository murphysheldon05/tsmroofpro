-- Update profiles table RLS policy to restrict viewing
-- Users can only see their own profile, admins and managers can see all

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view profiles based on role" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);
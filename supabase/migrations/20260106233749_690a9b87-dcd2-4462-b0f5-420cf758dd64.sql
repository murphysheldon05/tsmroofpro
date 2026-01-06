-- Update profiles table RLS policy to explicitly require authentication
-- Only authenticated users can view profiles (own profile, or admins/managers can see all)

DROP POLICY IF EXISTS "Users can view profiles based on role" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles based on role" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = id 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  )
);
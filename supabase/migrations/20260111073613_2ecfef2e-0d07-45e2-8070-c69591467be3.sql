-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles based on role" ON public.profiles;

-- Create a new, more restrictive SELECT policy
-- Users can only view their own profile OR admins can view all profiles
CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id) OR has_role(auth.uid(), 'admin'::app_role)
);
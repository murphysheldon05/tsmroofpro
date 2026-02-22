-- Drop the role column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Drop the user_role enum type
DROP TYPE IF EXISTS public.user_role;

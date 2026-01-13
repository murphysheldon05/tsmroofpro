-- Add requested_role column to profiles for self-registration flow
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS requested_role TEXT;

-- Add company_name column for subcontractors/vendors during signup
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT;
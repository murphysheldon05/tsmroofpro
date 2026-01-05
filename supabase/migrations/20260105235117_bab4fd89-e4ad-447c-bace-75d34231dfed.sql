-- Add must_reset_password column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS must_reset_password boolean DEFAULT false;
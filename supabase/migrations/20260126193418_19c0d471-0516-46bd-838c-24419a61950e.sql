-- Fix employee_status default from 'active' to 'pending'
-- New signups should start as pending until admin approval
ALTER TABLE public.profiles 
ALTER COLUMN employee_status SET DEFAULT 'pending';

-- Update any existing users who are not approved but have 'active' status
-- This fixes the inconsistent state
UPDATE public.profiles 
SET employee_status = 'pending' 
WHERE is_approved = false AND employee_status = 'active';
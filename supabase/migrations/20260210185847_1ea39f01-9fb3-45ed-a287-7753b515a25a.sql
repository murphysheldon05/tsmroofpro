
-- Step 1: Add 'user' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

-- Step 2: Add department text column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;

-- Step 3: Ensure all 6 departments exist
INSERT INTO public.departments (name, sort_order, is_active)
VALUES 
  ('Accounting', 3, true),
  ('HR / IT', 4, true),
  ('Admin', 5, true),
  ('Operations', 6, true)
ON CONFLICT DO NOTHING;

-- Update 'Office' department to 'HR / IT' if HR / IT doesn't already exist as separate
UPDATE public.departments SET name = 'HR / IT', sort_order = 4 
WHERE name = 'Office' 
AND NOT EXISTS (SELECT 1 FROM public.departments WHERE name = 'HR / IT');

-- Ensure Sales and Production have correct sort order
UPDATE public.departments SET sort_order = 1 WHERE name = 'Sales';
UPDATE public.departments SET sort_order = 2 WHERE name = 'Production';

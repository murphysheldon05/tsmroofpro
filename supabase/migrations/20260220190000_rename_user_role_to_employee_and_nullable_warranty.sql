-- 1. Add 'employee' to app_role enum if not already present
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';

-- 2. Rename existing 'user' roles to 'employee'
UPDATE public.user_roles SET role = 'employee' WHERE role = 'user';

-- 3. Make warranty_requests columns nullable for simplified create form
ALTER TABLE public.warranty_requests ALTER COLUMN original_install_date DROP NOT NULL;
ALTER TABLE public.warranty_requests ALTER COLUMN warranty_coverage_description DROP NOT NULL;
ALTER TABLE public.warranty_requests ALTER COLUMN warranty_expiration_date DROP NOT NULL;


-- Migrate existing roles now that 'user' enum value is committed
-- employee → user
UPDATE public.user_roles SET role = 'user' WHERE role = 'employee';
-- accounting → manager
UPDATE public.user_roles SET role = 'manager' WHERE role = 'accounting';
-- ops_compliance → admin
UPDATE public.user_roles SET role = 'admin' WHERE role = 'ops_compliance';

-- Set department text on profiles based on existing department_id
UPDATE public.profiles p
SET department = d.name
FROM public.departments d
WHERE p.department_id = d.id AND p.department IS NULL;

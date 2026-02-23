-- Set Paul's account from Admin to Manager level.
-- Run once; safe to re-run (only updates where role was 'admin' and profile email contains 'paul').
UPDATE public.user_roles
SET role = 'manager'::app_role
WHERE role = 'admin'::app_role
  AND user_id IN (SELECT id FROM public.profiles WHERE LOWER(COALESCE(email, '')) LIKE '%paul%');

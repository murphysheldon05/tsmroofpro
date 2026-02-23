-- One-time fix: Set Paul Santiano (paul.santiano@tsmroofs.com) from admin to manager.
-- Run this once per environment via Supabase SQL Editor or: psql -f scripts/set_paul_manager_role.sql
-- Safe to re-run (idempotent).
--
-- Future migrations will NOT change Paul's role: the Paul update was removed from
-- supabase/migrations/20260223230000_paul_manager_role.sql (now a no-op).

-- 1. Apply the role change
UPDATE public.user_roles
SET role = 'manager'::app_role
WHERE role = 'admin'::app_role
  AND user_id IN (
    SELECT id FROM public.profiles
    WHERE LOWER(COALESCE(email, '')) = 'paul.santiano@tsmroofs.com'
  );

-- 2. Verify Paul's role is manager (output below should show role = 'manager')
SELECT p.email, ur.role
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE LOWER(p.email) = 'paul.santiano@tsmroofs.com';

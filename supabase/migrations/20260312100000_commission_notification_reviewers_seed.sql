-- Ensure commission submission notifications reach both Compliance officers (email + in-app).
-- Idempotent: safe to run multiple times.

-- 1. notification_routing: commission_submission -> Compliance
INSERT INTO public.notification_routing (notification_type, primary_role, fallback_email, enabled)
VALUES ('commission_submission', 'Compliance', 'sheldonmurphy@tsmroofs.com', true)
ON CONFLICT (notification_type) DO UPDATE SET
  primary_role = EXCLUDED.primary_role,
  fallback_email = EXCLUDED.fallback_email,
  updated_at = now();

-- 2. role_assignments: Compliance with both emails
INSERT INTO public.role_assignments (role_name, assigned_email, backup_email, active)
SELECT 'Compliance', 'mannym@tsmroofs.com', 'sheldonmurphy@tsmroofs.com', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_assignments WHERE role_name = 'Compliance');
UPDATE public.role_assignments
SET assigned_email = 'mannym@tsmroofs.com',
    backup_email = 'sheldonmurphy@tsmroofs.com',
    updated_at = now()
WHERE role_name = 'Compliance';

-- 3. commission_reviewers: compliance officers get in-app notifications (match by email)
INSERT INTO public.commission_reviewers (user_email, user_name, can_approve, can_payout, is_active)
VALUES
  ('mannym@tsmroofs.com', 'Manny Madrid', true, false, true),
  ('sheldonmurphy@tsmroofs.com', 'Sheldon Murphy', true, false, true)
ON CONFLICT (user_email) DO UPDATE SET
  user_name = EXCLUDED.user_name,
  is_active = true,
  updated_at = now();

-- Commission notification routing and reviewers (idempotent).
-- Manny Madrid = Compliance; Courtney Murphy = Accounting; Sheldon Murphy = Owner (admin access to all).

-- 1. notification_routing: commission_submission -> Compliance (Manny); fallback = Owner (Sheldon)
INSERT INTO public.notification_routing (notification_type, primary_role, fallback_email, enabled)
VALUES ('commission_submission', 'Compliance', 'sheldonmurphy@tsmroofs.com', true)
ON CONFLICT (notification_type) DO UPDATE SET
  primary_role = EXCLUDED.primary_role,
  fallback_email = EXCLUDED.fallback_email,
  updated_at = now();

-- commission_accounting -> Accounting (Courtney) for "ready for payment" emails
INSERT INTO public.notification_routing (notification_type, primary_role, fallback_email, enabled)
VALUES ('commission_accounting', 'Accounting', 'courtneymurphy@tsmroofs.com', true)
ON CONFLICT (notification_type) DO UPDATE SET
  primary_role = EXCLUDED.primary_role,
  fallback_email = EXCLUDED.fallback_email,
  updated_at = now();

-- 2. role_assignments: Compliance (Manny + Sheldon backup), Accounting (Courtney)
INSERT INTO public.role_assignments (role_name, assigned_email, backup_email, active)
SELECT 'Compliance', 'mannymadrid@tsmroofs.com', 'sheldonmurphy@tsmroofs.com', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_assignments WHERE role_name = 'Compliance');
UPDATE public.role_assignments
SET assigned_email = 'mannymadrid@tsmroofs.com',
    backup_email = 'sheldonmurphy@tsmroofs.com',
    updated_at = now()
WHERE role_name = 'Compliance';

INSERT INTO public.role_assignments (role_name, assigned_email, backup_email, active)
SELECT 'Accounting', 'courtneymurphy@tsmroofs.com', 'sheldonmurphy@tsmroofs.com', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_assignments WHERE role_name = 'Accounting');
UPDATE public.role_assignments
SET assigned_email = 'courtneymurphy@tsmroofs.com',
    backup_email = 'sheldonmurphy@tsmroofs.com',
    updated_at = now()
WHERE role_name = 'Accounting';

-- 3. commission_reviewers: all three get in-app notifications (Compliance, Accounting, Owner)
INSERT INTO public.commission_reviewers (user_email, user_name, can_approve, can_payout, is_active)
VALUES
  ('mannymadrid@tsmroofs.com', 'Manny Madrid', true, false, true),
  ('courtneymurphy@tsmroofs.com', 'Courtney Murphy', true, true, true),
  ('sheldonmurphy@tsmroofs.com', 'Sheldon Murphy', true, true, true)
ON CONFLICT (user_email) DO UPDATE SET
  user_name = EXCLUDED.user_name,
  can_approve = EXCLUDED.can_approve,
  can_payout = EXCLUDED.can_payout,
  is_active = true,
  updated_at = now();

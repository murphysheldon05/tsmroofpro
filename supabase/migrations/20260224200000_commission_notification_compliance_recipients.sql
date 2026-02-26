-- Commission submission notifications: Compliance (Manny Madrid, Sheldon Murphy) at tsmroofs.com
-- Both receive commission submission emails via assigned_email + backup_email

-- Add Compliance role with Manny and Sheldon emails (if not exists)
INSERT INTO public.role_assignments (role_name, assigned_email, backup_email, active)
SELECT 'Compliance', 'mannym@tsmroofs.com', 'sheldonmurphy@tsmroofs.com', true
WHERE NOT EXISTS (SELECT 1 FROM public.role_assignments WHERE role_name = 'Compliance');

-- Update existing Compliance role with emails
UPDATE public.role_assignments
SET assigned_email = 'mannym@tsmroofs.com',
    backup_email = 'sheldonmurphy@tsmroofs.com',
    updated_at = now()
WHERE role_name = 'Compliance';

-- Route commission_submission to Compliance (Manny/Sheldon) instead of Accounting
UPDATE public.notification_routing
SET primary_role = 'Compliance',
    fallback_email = 'sheldonmurphy@tsmroofs.com',
    updated_at = now()
WHERE notification_type = 'commission_submission';

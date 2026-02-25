-- Remove approval process: new signups get immediate access with user-level role.
-- Invite link is the only gate; once they create an account, they're active.

-- 1. Update handle_new_user to set employee_status='active' and is_approved=true
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_approved, employee_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    true,
    'active'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

-- 2. Disable the pending_approval trigger so no pending_approvals row is created
DROP TRIGGER IF EXISTS trigger_create_pending_approval_for_user ON public.profiles;

-- 3. Approve any currently-pending users so they aren't stuck
UPDATE public.profiles
SET employee_status = 'active', is_approved = true
WHERE employee_status = 'pending' AND is_approved = false;

UPDATE public.pending_approvals
SET status = 'approved', approved_at = now()
WHERE entity_type = 'user' AND status = 'pending';

-- ============================================================================
-- REMOVE APPROVAL PROCESS: Invite link grants immediate access
-- New signups get employee_status='active' and is_approved=true; no pending approval.
-- ============================================================================

-- 1. Update handle_new_user: set employee_status='active', is_approved=true, role='employee'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_approved, employee_status)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), true, 'active');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$function$;

-- 2. Disable trigger that creates pending_approvals for new users (no longer needed)
DROP TRIGGER IF EXISTS trigger_create_pending_approval_for_user ON public.profiles;

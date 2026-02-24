-- Remove user approval gate for invite-based signup flow.
-- Invited users become active immediately after account creation.

-- 1) New auth signups: create active profile + baseline employee role.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    is_approved,
    employee_status,
    approved_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    true,
    'active',
    now()
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');

  RETURN NEW;
END;
$function$;

-- 2) Disable auto-created pending approval records for new profiles.
DROP TRIGGER IF EXISTS trigger_create_pending_approval_for_user ON public.profiles;

-- 3) Backfill any currently pending users so they can log in immediately.
UPDATE public.profiles
SET
  is_approved = true,
  employee_status = 'active',
  approved_at = COALESCE(approved_at, now())
WHERE employee_status = 'pending'
   OR (employee_status IS NULL AND COALESCE(is_approved, false) = false);

-- 4) Mark stale user pending approvals as completed for historical cleanliness.
UPDATE public.pending_approvals
SET
  status = 'completed',
  completed_at = COALESCE(completed_at, now()),
  notes = CONCAT(COALESCE(notes, ''), CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE ' | ' END, 'Auto-completed: approval flow removed')
WHERE entity_type = 'user'
  AND status = 'pending';

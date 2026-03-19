-- Remove pending approval flow entirely.
-- All invited users get immediate access with 'user' role.
-- Admins are notified and can adjust settings after the fact.

-- 1) Update handle_new_user: default role is now 'user' (was 'employee').
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
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;

-- 2) Approve ALL currently pending users so nobody is stuck.
UPDATE public.profiles
SET
  is_approved   = true,
  employee_status = 'active',
  approved_at   = COALESCE(approved_at, now())
WHERE employee_status = 'pending'
   OR employee_status IS NULL
   OR COALESCE(is_approved, false) = false;

-- 3) Mark any remaining user pending_approvals as completed.
UPDATE public.pending_approvals
SET
  status       = 'completed',
  completed_at = COALESCE(completed_at, now()),
  notes        = CONCAT(
    COALESCE(notes, ''),
    CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE ' | ' END,
    'Auto-completed: approval flow removed 2026-03-16'
  )
WHERE entity_type = 'user'
  AND status = 'pending';

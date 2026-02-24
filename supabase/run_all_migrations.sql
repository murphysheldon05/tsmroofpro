-- =============================================================================
-- COMPREHENSIVE MIGRATION SCRIPT
-- Project: rrcbxpgbgahjrdizktrt (TSM Roof Pro)
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================
-- Combines all pending migrations from 2026-02-24:
--   1. Production department schedule permissions
--   2. Remove approval process (immediate access for new signups)
--   3. Backfill existing pending users
--   4. Sync profiles.department from department_id
-- =============================================================================

BEGIN;

-- =========================================================================
-- 1) PRODUCTION DEPARTMENT SCHEDULE PERMISSIONS
-- Production users can UPDATE (edit) build & delivery schedule entries
-- =========================================================================

DROP POLICY IF EXISTS "Managers and admins can update calendar events" ON public.production_calendar_events;
DROP POLICY IF EXISTS "Managers admins and production can update calendar events" ON public.production_calendar_events;
CREATE POLICY "Managers admins and production can update calendar events"
ON public.production_calendar_events
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'sales_manager') OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.department = 'Production'
           OR p.department_id IN (SELECT id FROM public.departments WHERE name = 'Production'))
  )
);

DROP POLICY IF EXISTS "Managers and admins can update delivery events" ON public.delivery_calendar_events;
DROP POLICY IF EXISTS "Managers admins and production can update delivery events" ON public.delivery_calendar_events;
CREATE POLICY "Managers admins and production can update delivery events"
ON public.delivery_calendar_events
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'sales_manager') OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.department = 'Production'
           OR p.department_id IN (SELECT id FROM public.departments WHERE name = 'Production'))
  )
);

-- =========================================================================
-- 2) REMOVE APPROVAL PROCESS - Immediate access for new signups
-- handle_new_user() now creates active, approved profiles with employee role
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_approved, employee_status, approved_at)
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

-- Drop the pending_approval trigger (no longer needed)
DROP TRIGGER IF EXISTS trigger_create_pending_approval_for_user ON public.profiles;

-- =========================================================================
-- 3) BACKFILL - Activate any existing pending users
-- =========================================================================

UPDATE public.profiles
SET
  is_approved = true,
  employee_status = 'active',
  approved_at = COALESCE(approved_at, now())
WHERE employee_status = 'pending'
   OR (employee_status IS NULL AND COALESCE(is_approved, false) = false);

UPDATE public.pending_approvals
SET
  status = 'completed',
  completed_at = COALESCE(completed_at, now()),
  notes = CONCAT(
    COALESCE(notes, ''),
    CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE ' | ' END,
    'Auto-completed: approval flow removed'
  )
WHERE entity_type = 'user'
  AND status = 'pending';

-- =========================================================================
-- 4) SYNC profiles.department FROM department_id
-- Keeps the string department field in sync when department_id changes
-- =========================================================================

CREATE OR REPLACE FUNCTION public.sync_profiles_department_from_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.department_id IS NOT NULL THEN
    SELECT name INTO NEW.department
    FROM public.departments
    WHERE id = NEW.department_id;
  ELSE
    NEW.department := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_profiles_department ON public.profiles;
CREATE TRIGGER trigger_sync_profiles_department
  BEFORE INSERT OR UPDATE OF department_id
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profiles_department_from_id();

COMMIT;

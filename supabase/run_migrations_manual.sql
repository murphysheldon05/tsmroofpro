-- =============================================================================
-- Run this in Supabase Dashboard > SQL Editor if CLI push fails
-- Project: rrcbxpgbgahjrdizktrt
-- =============================================================================

-- Migration: 20260224000000_production_dept_schedule_permissions
-- Production department users can UPDATE (edit) build and delivery schedule entries
DROP POLICY IF EXISTS "Managers and admins can update calendar events" ON public.production_calendar_events;
CREATE POLICY "Managers admins and production can update calendar events"
ON public.production_calendar_events
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'sales_manager') OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.department = 'Production' OR p.department_id IN (SELECT id FROM public.departments WHERE name = 'Production')))
);

DROP POLICY IF EXISTS "Managers and admins can update delivery events" ON public.delivery_calendar_events;
CREATE POLICY "Managers admins and production can update delivery events"
ON public.delivery_calendar_events
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'sales_manager') OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.department = 'Production' OR p.department_id IN (SELECT id FROM public.departments WHERE name = 'Production')))
);

-- Migration: 20260224100000_remove_approval_immediate_access
-- New signups get immediate access (no approval flow)
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

DROP TRIGGER IF EXISTS trigger_create_pending_approval_for_user ON public.profiles;

-- Migration: 20260224110000_sync_profiles_department_from_id
-- Sync profiles.department from department_id when it changes
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

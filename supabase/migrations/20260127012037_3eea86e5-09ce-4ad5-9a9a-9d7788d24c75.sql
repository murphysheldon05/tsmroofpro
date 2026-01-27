-- Fix can_view_profile function to explicitly deny access to unauthenticated users
-- and ensure stricter access control

CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_role app_role;
  viewer_dept_id UUID;
  target_dept_id UUID;
  target_consent BOOLEAN;
  is_dept_manager BOOLEAN;
BEGIN
  -- CRITICAL: Deny access if viewer is not authenticated (NULL user id)
  IF _viewer_id IS NULL THEN
    RETURN false;
  END IF;

  -- Always can view own profile
  IF _viewer_id = _target_id THEN
    RETURN true;
  END IF;
  
  -- Get viewer's role
  SELECT role INTO viewer_role FROM user_roles WHERE user_id = _viewer_id LIMIT 1;
  
  -- If viewer has no role assigned, deny access (not a valid user)
  IF viewer_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admins can view all
  IF viewer_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Get departments and consent
  SELECT department_id INTO viewer_dept_id FROM profiles WHERE id = _viewer_id;
  SELECT department_id, COALESCE(data_consent_given, false) INTO target_dept_id, target_consent FROM profiles WHERE id = _target_id;
  
  -- If target hasn't given consent, only admins and self can view (already handled above)
  IF NOT target_consent THEN
    RETURN false;
  END IF;
  
  -- Managers can view profiles in departments they manage
  IF viewer_role = 'manager' THEN
    SELECT EXISTS(
      SELECT 1 FROM department_managers dm
      WHERE dm.manager_id = _viewer_id 
      AND dm.department_id = target_dept_id
    ) INTO is_dept_manager;
    
    IF is_dept_manager THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Same department employees can view each other if consent given
  IF viewer_dept_id IS NOT NULL AND viewer_dept_id = target_dept_id AND target_consent THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;
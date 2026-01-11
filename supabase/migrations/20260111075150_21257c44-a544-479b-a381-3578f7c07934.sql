-- Create departments table (admin-configurable)
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Policies for departments
CREATE POLICY "Anyone authenticated can view active departments"
ON public.departments FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add department_id to profiles for employee department assignment
ALTER TABLE public.profiles ADD COLUMN department_id UUID REFERENCES public.departments(id);

-- Add data_consent column to profiles
ALTER TABLE public.profiles ADD COLUMN data_consent_given BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN data_consent_given_at TIMESTAMP WITH TIME ZONE;

-- Create department_managers junction table (which managers manage which departments)
CREATE TABLE public.department_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL,
  is_team_lead BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(department_id, manager_id)
);

-- Enable RLS on department_managers
ALTER TABLE public.department_managers ENABLE ROW LEVEL SECURITY;

-- Policies for department_managers
CREATE POLICY "Admins can manage department managers"
ON public.department_managers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view their department assignments"
ON public.department_managers FOR SELECT
USING (manager_id = auth.uid());

CREATE POLICY "Employees can view department managers"
ON public.department_managers FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default departments
INSERT INTO public.departments (name, description, sort_order) VALUES
  ('Sales', 'Sales department', 1),
  ('Production', 'Production department', 2),
  ('Office', 'Office administration department', 3);

-- Create function to check if user can view another user's profile
-- Users can view profiles if:
-- 1. It's their own profile
-- 2. They're an admin
-- 3. They're a manager of that user's department
-- 4. They're in the same department AND the target user has given data consent
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id UUID, _target_id UUID)
RETURNS BOOLEAN
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
  -- Always can view own profile
  IF _viewer_id = _target_id THEN
    RETURN true;
  END IF;
  
  -- Get viewer's role
  SELECT role INTO viewer_role FROM user_roles WHERE user_id = _viewer_id LIMIT 1;
  
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

-- Drop the old profiles SELECT policy
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;

-- Create new policy using the can_view_profile function
CREATE POLICY "Users can view profiles based on department and consent"
ON public.profiles FOR SELECT
USING (can_view_profile(auth.uid(), id));

-- Add trigger for updated_at on departments
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
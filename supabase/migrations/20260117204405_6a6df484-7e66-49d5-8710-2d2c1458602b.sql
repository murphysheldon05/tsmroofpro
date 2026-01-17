-- Create enum types for app governance
CREATE TYPE public.app_category AS ENUM (
  'crm', 'accounting', 'communications', 'suppliers', 'financing', 
  'training', 'marketing', 'storage', 'social', 'productivity', 'other'
);

CREATE TYPE public.app_access_method AS ENUM (
  'sso_microsoft', 'sso_google', 'vendor_login', 'api_key', 'other'
);

CREATE TYPE public.assignment_role AS ENUM (
  'business_owner', 'system_admin', 'onboarding_owner', 'access_monitor',
  'it_triage_owner', 'operator', 'profile_owner', 'external_vendor'
);

CREATE TYPE public.permission_level AS ENUM (
  'top_tier_admin', 'admin', 'standard_user', 'limited_user', 'none'
);

CREATE TYPE public.checklist_type AS ENUM ('onboarding', 'offboarding');

CREATE TYPE public.checklist_status AS ENUM ('not_started', 'in_progress', 'completed');

CREATE TYPE public.checklist_item_status AS ENUM ('open', 'blocked', 'done');

CREATE TYPE public.checklist_category AS ENUM ('access', 'training', 'security', 'compliance');

CREATE TYPE public.it_request_type AS ENUM ('access', 'issue', 'change', 'training');

CREATE TYPE public.it_request_priority AS ENUM ('cant_work', 'workaround', 'nice_to_have');

CREATE TYPE public.it_request_status AS ENUM ('new', 'in_progress', 'waiting_on_vendor', 'resolved');

CREATE TYPE public.employee_status AS ENUM ('active', 'pending', 'inactive');

-- 1) Applications table
CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL,
  category public.app_category NOT NULL DEFAULT 'other',
  source_of_truth text,
  description text,
  access_method public.app_access_method DEFAULT 'vendor_login',
  vendor_contact text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage applications" ON public.applications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active applications" ON public.applications
  FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'active');

-- 2) App Assignments table (links employees to applications)
CREATE TABLE public.app_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.applications(id),
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  assignment_role public.assignment_role NOT NULL,
  permission_level public.permission_level NOT NULL DEFAULT 'standard_user',
  scope_notes text,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage app assignments" ON public.app_assignments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view department assignments" ON public.app_assignments
  FOR SELECT USING (
    has_role(auth.uid(), 'manager'::app_role) AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = app_assignments.employee_id 
      AND p.department_id IN (
        SELECT department_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their own assignments" ON public.app_assignments
  FOR SELECT USING (employee_id = auth.uid());

-- 3) Checklist Templates table
CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type public.checklist_type NOT NULL,
  applies_to_assignment_role public.assignment_role,
  app_id uuid REFERENCES public.applications(id),
  title text NOT NULL,
  steps text,
  category public.checklist_category NOT NULL DEFAULT 'access',
  default_due_days integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage checklist templates" ON public.checklist_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active templates" ON public.checklist_templates
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- 4) User Checklists table (generated per employee)
CREATE TABLE public.user_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  checklist_type public.checklist_type NOT NULL,
  status public.checklist_status NOT NULL DEFAULT 'not_started',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  notes text
);

ALTER TABLE public.user_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all checklists" ON public.user_checklists
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view department checklists" ON public.user_checklists
  FOR SELECT USING (
    has_role(auth.uid(), 'manager'::app_role) AND EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = user_checklists.employee_id 
      AND p.department_id IN (
        SELECT department_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their own checklists" ON public.user_checklists
  FOR SELECT USING (employee_id = auth.uid());

-- 5) Checklist Items table
CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.user_checklists(id) ON DELETE CASCADE,
  app_id uuid REFERENCES public.applications(id),
  title text NOT NULL,
  description text,
  owner_employee_id uuid REFERENCES public.profiles(id),
  due_date date,
  status public.checklist_item_status NOT NULL DEFAULT 'open',
  evidence_link text,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all checklist items" ON public.checklist_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view department checklist items" ON public.checklist_items
  FOR SELECT USING (
    has_role(auth.uid(), 'manager'::app_role) AND EXISTS (
      SELECT 1 FROM public.user_checklists uc
      JOIN public.profiles p ON p.id = uc.employee_id
      WHERE uc.id = checklist_items.checklist_id
      AND p.department_id IN (
        SELECT department_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view and update their own checklist items" ON public.checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_checklists uc 
      WHERE uc.id = checklist_items.checklist_id AND uc.employee_id = auth.uid()
    )
  );

CREATE POLICY "Item owners can update their assigned items" ON public.checklist_items
  FOR UPDATE USING (owner_employee_id = auth.uid());

-- 6) IT Requests table
CREATE TABLE public.it_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id),
  app_id uuid REFERENCES public.applications(id),
  request_type public.it_request_type NOT NULL,
  priority public.it_request_priority NOT NULL DEFAULT 'nice_to_have',
  description text NOT NULL,
  status public.it_request_status NOT NULL DEFAULT 'new',
  assigned_to_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.it_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all IT requests" ON public.it_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can manage IT requests" ON public.it_requests
  FOR ALL USING (has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can view their own and assigned requests" ON public.it_requests
  FOR SELECT USING (requester_id = auth.uid() OR assigned_to_id = auth.uid());

CREATE POLICY "Users can create requests" ON public.it_requests
  FOR INSERT WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update their own requests" ON public.it_requests
  FOR UPDATE USING (requester_id = auth.uid());

-- 7) Offboarding Audit Log table
CREATE TABLE public.offboarding_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  executed_by uuid NOT NULL REFERENCES public.profiles(id),
  apps_affected integer NOT NULL DEFAULT 0,
  checklist_id uuid REFERENCES public.user_checklists(id),
  it_request_ids uuid[] DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offboarding_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage offboarding audit log" ON public.offboarding_audit_log
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add employee_status to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS employee_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS role_title text,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.profiles(id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_assignments_updated_at
  BEFORE UPDATE ON public.app_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_templates_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_it_requests_updated_at
  BEFORE UPDATE ON public.it_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
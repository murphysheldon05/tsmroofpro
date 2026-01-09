-- Create team_assignments table to link employees to managers
CREATE TABLE public.team_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (employee_id)  -- Each employee can only have one manager
);

-- Enable RLS
ALTER TABLE public.team_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage team assignments"
ON public.team_assignments
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Managers can view their team members
CREATE POLICY "Managers can view their team"
ON public.team_assignments
FOR SELECT
USING (manager_id = auth.uid() AND public.has_role(auth.uid(), 'manager'));

-- Employees can view their own assignment
CREATE POLICY "Employees can view their assignment"
ON public.team_assignments
FOR SELECT
USING (employee_id = auth.uid());

-- Add approval_stage to requests table for multi-stage workflow
-- pending_manager -> manager_approved -> approved (by admin) or rejected
ALTER TABLE public.requests 
ADD COLUMN approval_stage TEXT DEFAULT 'pending' 
CHECK (approval_stage IN ('pending', 'pending_manager', 'manager_approved', 'approved', 'rejected'));

-- Add manager_id to track which manager should approve
ALTER TABLE public.requests
ADD COLUMN assigned_manager_id UUID REFERENCES auth.users(id);

-- Add manager approval timestamp
ALTER TABLE public.requests
ADD COLUMN manager_approved_at TIMESTAMP WITH TIME ZONE;

-- Add manager notes
ALTER TABLE public.requests
ADD COLUMN manager_notes TEXT;
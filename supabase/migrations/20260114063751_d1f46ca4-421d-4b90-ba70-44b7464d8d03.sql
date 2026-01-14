-- Create notification_routing table for dynamic recipient routing
CREATE TABLE public.notification_routing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL UNIQUE,
  primary_role TEXT NOT NULL,
  fallback_email TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_routing ENABLE ROW LEVEL SECURITY;

-- Admin can manage notification routing
CREATE POLICY "Admins can manage notification routing"
ON public.notification_routing
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view notification routing
CREATE POLICY "Managers can view notification routing"
ON public.notification_routing
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Create role_assignments table for user-to-role mappings
CREATE TABLE public.role_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL,
  assigned_user_id UUID NULL,
  assigned_email TEXT NULL,
  backup_user_id UUID NULL,
  backup_email TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;

-- Admin can manage role assignments
CREATE POLICY "Admins can manage role assignments"
ON public.role_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view role assignments
CREATE POLICY "Managers can view role assignments"
ON public.role_assignments
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Seed notification routing data
INSERT INTO public.notification_routing (notification_type, primary_role, fallback_email, enabled) VALUES
('warranty_submission', 'Production', 'production@yourdomain.com', true),
('commission_submission', 'Accounting', 'accounting@yourdomain.com', true),
('commission_accounting', 'Accounting', 'accounting@yourdomain.com', true);

-- Seed role assignments (no users assigned yet, will use fallback)
INSERT INTO public.role_assignments (role_name, active) VALUES
('Production', true),
('Accounting', true),
('Admin', true);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_routing_updated_at
BEFORE UPDATE ON public.notification_routing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_assignments_updated_at
BEFORE UPDATE ON public.role_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
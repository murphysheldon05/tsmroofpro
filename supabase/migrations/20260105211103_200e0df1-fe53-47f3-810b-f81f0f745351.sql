-- Create tools table for admin-managed tools and systems
CREATE TABLE public.tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  url text NOT NULL,
  category text NOT NULL,
  icon text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- Anyone can view active tools
CREATE POLICY "Anyone can view active tools"
  ON public.tools
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage tools
CREATE POLICY "Admins can manage tools"
  ON public.tools
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create request_types table for admin-managed form types
CREATE TABLE public.request_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  icon text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.request_types ENABLE ROW LEVEL SECURITY;

-- Anyone can view active request types
CREATE POLICY "Anyone can view active request types"
  ON public.request_types
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage request types
CREATE POLICY "Admins can manage request types"
  ON public.request_types
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_request_types_updated_at
  BEFORE UPDATE ON public.request_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tools
INSERT INTO public.tools (name, description, url, category, sort_order) VALUES
  ('AccuLynx', 'Project management and CRM for roofing contractors', 'https://www.acculynx.com/', 'Project Management', 1),
  ('CompanyCam', 'Photo documentation and collaboration app', 'https://www.companycam.com/', 'Documentation', 2),
  ('Xactimate', 'Estimating software for insurance claims', 'https://www.xactware.com/', 'Estimating', 3),
  ('EagleView', 'Aerial roof measurement reports', 'https://www.eagleview.com/', 'Measurements', 4),
  ('Roofr', 'Instant roof measurements and proposals', 'https://www.roofr.com/', 'Measurements', 5),
  ('Microsoft 365', 'Outlook, Teams, and productivity apps', 'https://www.office.com/', 'Productivity', 6);

-- Insert default request types
INSERT INTO public.request_types (value, label, description, icon, sort_order) VALUES
  ('commission', 'Commission Form', 'Submit commission for manager approval', 'DollarSign', 1),
  ('sop_update', 'SOP Update Request', 'Request changes or additions to SOPs', 'FileEdit', 2),
  ('it_access', 'IT / Access Request', 'Request system access or IT support', 'Monitor', 3),
  ('hr', 'HR Request', 'HR-related requests and inquiries', 'Users', 4);
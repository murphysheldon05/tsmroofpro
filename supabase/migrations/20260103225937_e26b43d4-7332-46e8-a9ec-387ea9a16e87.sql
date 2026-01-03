-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'manager' THEN 2 
      WHEN 'employee' THEN 3 
    END
  LIMIT 1
$$;

CREATE POLICY "Users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id),
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create resources table
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  tags TEXT[] DEFAULT '{}',
  owner_id UUID REFERENCES auth.users(id),
  url TEXT,
  file_path TEXT,
  version TEXT DEFAULT 'v1.0',
  effective_date DATE,
  visibility app_role NOT NULL DEFAULT 'employee',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resources based on role" ON public.resources FOR SELECT TO authenticated USING (
  CASE visibility
    WHEN 'employee' THEN true
    WHEN 'manager' THEN public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')
    WHEN 'admin' THEN public.has_role(auth.uid(), 'admin')
  END
);

CREATE POLICY "Admins and managers can insert resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins and managers can update resources" ON public.resources FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins can delete resources" ON public.resources FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active announcements" ON public.announcements FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create requests table
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('sop_update', 'it_access', 'hr')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own requests" ON public.requests FOR SELECT TO authenticated USING (submitted_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Users can insert requests" ON public.requests FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "Admins can manage requests" ON public.requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categories
INSERT INTO public.categories (name, slug, description, icon, sort_order) VALUES
('Sales', 'sales', 'Sales department SOPs and resources', 'TrendingUp', 1),
('Production', 'production', 'Production and installation procedures', 'Hammer', 2),
('Supplements', 'supplements', 'Insurance supplement documentation', 'FileText', 3),
('Office Admin', 'office-admin', 'Office administration procedures', 'Building2', 4),
('Accounting', 'accounting', 'Financial and accounting processes', 'Calculator', 5),
('Safety / HR', 'safety-hr', 'Safety protocols and HR policies', 'Shield', 6),
('Templates & Scripts', 'templates-scripts', 'Templates and call scripts', 'FileCode', 7),
('New Hire Orientation', 'new-hire', 'Onboarding and orientation materials', 'UserPlus', 8),
('Role Training', 'role-training', 'Role-specific training tracks', 'GraduationCap', 9),
('Video Library', 'video-library', 'Training videos and tutorials', 'Video', 10);

-- Seed resources
INSERT INTO public.resources (title, description, category_id, tags, version, visibility) VALUES
('Sales Inspection Checklist SOP', 'Complete checklist for conducting roof inspections during sales calls. Covers all roof types and documentation requirements.', (SELECT id FROM public.categories WHERE slug = 'sales'), ARRAY['inspection', 'checklist', 'sales'], 'v2.1', 'employee'),
('Lead Intake SOP', 'Standard procedure for receiving and processing new leads. Includes phone scripts and CRM entry guidelines.', (SELECT id FROM public.categories WHERE slug = 'office-admin'), ARRAY['leads', 'intake', 'crm'], 'v1.5', 'employee'),
('Production Job Start Checklist', 'Pre-job checklist for production team. Material verification, crew assignment, and safety review.', (SELECT id FROM public.categories WHERE slug = 'production'), ARRAY['production', 'checklist', 'job-start'], 'v3.0', 'employee'),
('Supplement Documentation Standards', 'Guidelines for documenting supplemental claims. Photo requirements, measurement standards, and submission process.', (SELECT id FROM public.categories WHERE slug = 'supplements'), ARRAY['supplements', 'documentation', 'claims'], 'v2.3', 'employee'),
('Final Payment & Closeout', 'Procedure for final invoicing, payment collection, and job closeout in AccuLynx.', (SELECT id FROM public.categories WHERE slug = 'accounting'), ARRAY['payment', 'closeout', 'invoicing'], 'v1.8', 'employee'),
('Safety Training Overview', 'Required safety training modules for all field personnel. OSHA compliance and company policies.', (SELECT id FROM public.categories WHERE slug = 'safety-hr'), ARRAY['safety', 'training', 'osha'], 'v4.0', 'employee'),
('Customer Call Scripts', 'Approved scripts for common customer interactions including appointment setting, follow-ups, and objection handling.', (SELECT id FROM public.categories WHERE slug = 'templates-scripts'), ARRAY['scripts', 'phone', 'customer-service'], 'v2.0', 'employee'),
('New Employee Orientation Guide', 'Complete orientation guide for new hires. Company overview, policies, benefits, and first-week schedule.', (SELECT id FROM public.categories WHERE slug = 'new-hire'), ARRAY['onboarding', 'orientation', 'new-hire'], 'v3.2', 'employee'),
('Sales Rep Training Track', 'Complete training curriculum for new sales representatives. Includes product knowledge, sales process, and certification requirements.', (SELECT id FROM public.categories WHERE slug = 'role-training'), ARRAY['sales', 'training', 'certification'], 'v2.5', 'employee'),
('AccuLynx Quick Start Guide', 'Video tutorial covering AccuLynx basics for new users.', (SELECT id FROM public.categories WHERE slug = 'video-library'), ARRAY['acculynx', 'video', 'tutorial'], 'v1.0', 'employee');

-- Seed announcements
INSERT INTO public.announcements (title, content, priority, is_active) VALUES
('Welcome to the TSM Portal', 'This is your new central hub for all company resources, SOPs, and training materials. Explore the navigation to find what you need!', 'high', true),
('Q1 Safety Training Due', 'All field personnel must complete the updated Q1 safety training by end of month. Access it in the Training section.', 'urgent', true),
('New Supplement Process', 'We have updated our supplement documentation process. Please review the new SOP in the Supplements category.', 'normal', true);
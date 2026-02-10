
-- Update get_user_role to handle new roles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'accounting' THEN 2
      WHEN 'manager' THEN 3 
      WHEN 'sales_manager' THEN 4
      WHEN 'sales_rep' THEN 5
      WHEN 'ops_compliance' THEN 6
      WHEN 'employee' THEN 7 
    END
  LIMIT 1
$function$;

-- Create draws table
CREATE TABLE public.draws (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'active', 'paid_off', 'denied')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  denied_by UUID REFERENCES public.profiles(id),
  denial_reason TEXT,
  remaining_balance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create draw_applications table
CREATE TABLE public.draw_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  commission_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  applied_by UUID NOT NULL REFERENCES public.profiles(id),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create draw_settings table
CREATE TABLE public.draw_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Insert default draw settings
INSERT INTO public.draw_settings (setting_key, setting_value) VALUES
  ('max_draw_amount', 4000),
  ('max_duration_weeks', 4),
  ('warning_balance_threshold', 2000);

-- Enable RLS
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_settings ENABLE ROW LEVEL SECURITY;

-- RLS for draws
CREATE POLICY "Users can view own draws" ON public.draws
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin can view all draws" ON public.draws
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager can view all draws" ON public.draws
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Sales manager can view all draws" ON public.draws
  FOR SELECT USING (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Users can request draws" ON public.draws
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can update draws" ON public.draws
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager can update draws" ON public.draws
  FOR UPDATE USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Sales manager can update draws" ON public.draws
  FOR UPDATE USING (public.has_role(auth.uid(), 'sales_manager'));

-- RLS for draw_applications
CREATE POLICY "Users can view own draw applications" ON public.draw_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.draws WHERE draws.id = draw_applications.draw_id AND draws.user_id = auth.uid())
  );
CREATE POLICY "Admin can view all draw applications" ON public.draw_applications
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager can view all draw applications" ON public.draw_applications
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admin can insert draw applications" ON public.draw_applications
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Manager can insert draw applications" ON public.draw_applications
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Sales manager can insert draw applications" ON public.draw_applications
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'sales_manager'));
CREATE POLICY "Sales manager can view draw applications" ON public.draw_applications
  FOR SELECT USING (public.has_role(auth.uid(), 'sales_manager'));

-- RLS for draw_settings
CREATE POLICY "Anyone can read draw settings" ON public.draw_settings
  FOR SELECT USING (true);
CREATE POLICY "Admin can update draw settings" ON public.draw_settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Triggers
CREATE TRIGGER update_draws_updated_at
  BEFORE UPDATE ON public.draws
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_draw_settings_updated_at
  BEFORE UPDATE ON public.draw_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

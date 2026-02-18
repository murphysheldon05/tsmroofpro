
-- 1. Commission Reps
CREATE TABLE public.commission_reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_reps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can view commission_reps" ON public.commission_reps FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admins can insert commission_reps" ON public.commission_reps FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update commission_reps" ON public.commission_reps FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete commission_reps" ON public.commission_reps FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2. Commission Pay Types
CREATE TABLE public.commission_pay_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  badge_bg TEXT NOT NULL DEFAULT '#e5e7eb',
  badge_text TEXT NOT NULL DEFAULT '#374151',
  badge_border TEXT NOT NULL DEFAULT '#d1d5db',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_pay_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view pay types" ON public.commission_pay_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert pay types" ON public.commission_pay_types FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pay types" ON public.commission_pay_types FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pay types" ON public.commission_pay_types FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed default pay types
INSERT INTO public.commission_pay_types (name, badge_bg, badge_text, badge_border, sort_order) VALUES
  ('Commission', '#dcfce7', '#166534', '#86efac', 1),
  ('Draw', '#fef3c7', '#92400e', '#fcd34d', 2),
  ('Draw/Guarantee', '#fef3c7', '#92400e', '#fcd34d', 3),
  ('Training Draw (NR)', '#dbeafe', '#1e40af', '#93c5fd', 4),
  ('Advance', '#fee2e2', '#991b1b', '#fca5a5', 5);

-- 3. Commission Pay Runs
CREATE TABLE public.commission_pay_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_pay_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can view pay runs" ON public.commission_pay_runs FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admins can insert pay runs" ON public.commission_pay_runs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pay runs" ON public.commission_pay_runs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pay runs" ON public.commission_pay_runs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Drop old commission_entries and recreate with new schema (table is empty)
DROP TABLE IF EXISTS public.commission_entries;

CREATE TABLE public.commission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID NOT NULL REFERENCES public.commission_reps(id) ON DELETE CASCADE,
  job TEXT,
  customer TEXT,
  approved_date DATE,
  job_value NUMERIC,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  paid_date DATE NOT NULL,
  check_type TEXT DEFAULT 'DIRECT DEPOSIT',
  notes TEXT,
  pay_type_id UUID NOT NULL REFERENCES public.commission_pay_types(id),
  earned_comm NUMERIC,
  applied_bank NUMERIC,
  has_paid BOOLEAN NOT NULL DEFAULT true,
  pay_run_id UUID REFERENCES public.commission_pay_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and managers can view entries" ON public.commission_entries FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
CREATE POLICY "Admins can insert entries" ON public.commission_entries FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update entries" ON public.commission_entries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete entries" ON public.commission_entries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Auto-link function: when a profile is created, link commission_reps by email
CREATE OR REPLACE FUNCTION public.auto_link_commission_rep()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.commission_reps
  SET user_id = NEW.id
  WHERE email = NEW.email AND user_id IS NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_link_commission_rep_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_commission_rep();

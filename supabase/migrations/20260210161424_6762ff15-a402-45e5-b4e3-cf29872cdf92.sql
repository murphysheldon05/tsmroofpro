
-- Sales Manager Override Tracking
-- Tracks approved commission count per rep and override amounts

CREATE TABLE IF NOT EXISTS public.sales_rep_override_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_rep_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_commission_count INTEGER NOT NULL DEFAULT 0,
  override_phase_complete BOOLEAN NOT NULL DEFAULT false,
  manually_adjusted_by UUID REFERENCES public.profiles(id),
  manually_adjusted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sales_rep_id)
);

ALTER TABLE public.sales_rep_override_tracking ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access on override tracking"
  ON public.sales_rep_override_tracking FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Sales managers can view their team
CREATE POLICY "Sales managers view team override tracking"
  ON public.sales_rep_override_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_assignments ta
      JOIN public.user_roles ur ON ur.user_id = auth.uid()
      WHERE ta.manager_id = auth.uid() AND ta.employee_id = sales_rep_id
      AND ur.role IN ('sales_manager', 'manager')
    )
  );

-- Users can view their own
CREATE POLICY "Users view own override tracking"
  ON public.sales_rep_override_tracking FOR SELECT
  USING (sales_rep_id = auth.uid());

-- Override log for each commission
CREATE TABLE IF NOT EXISTS public.sales_manager_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_id UUID NOT NULL,
  sales_rep_id UUID NOT NULL REFERENCES public.profiles(id),
  sales_manager_id UUID NOT NULL REFERENCES public.profiles(id),
  commission_number INTEGER NOT NULL,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  override_percentage NUMERIC NOT NULL DEFAULT 10,
  override_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_manager_overrides ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin full access on overrides"
  ON public.sales_manager_overrides FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Sales managers can view their overrides
CREATE POLICY "Sales managers view own overrides"
  ON public.sales_manager_overrides FOR SELECT
  USING (sales_manager_id = auth.uid());

-- Reps can view their own override records
CREATE POLICY "Reps view own override records"
  ON public.sales_manager_overrides FOR SELECT
  USING (sales_rep_id = auth.uid());

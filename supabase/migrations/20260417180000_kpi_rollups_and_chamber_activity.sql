-- =============================================================================
-- KPI weekly submission enhancements, monthly rollups, and chamber activity logs
-- =============================================================================

ALTER TABLE public.kpi_scorecard_entries
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS override_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS kpi_scorecard_entries_role_week_employee_idx
  ON public.kpi_scorecard_entries (scorecard_role, week_start_date, employee_name);

CREATE INDEX IF NOT EXISTS kpi_scorecard_entries_updated_at_idx
  ON public.kpi_scorecard_entries (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.kpi_monthly_rollups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name text NOT NULL,
  employee_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  scorecard_role text NOT NULL,
  month_year text NOT NULL,
  weeks_submitted int NOT NULL,
  monthly_avg_pct numeric,
  monthly_avg_rating numeric,
  monthly_rating_label text,
  bonus_amount numeric NOT NULL DEFAULT 0,
  bonus_tier_label text,
  bonus_status text NOT NULL DEFAULT 'pending'
    CHECK (bonus_status IN ('pending', 'paid', 'no_bonus')),
  paid_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  paid_date date,
  payment_method text,
  weekly_breakdown jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_name, scorecard_role, month_year)
);

CREATE INDEX IF NOT EXISTS kpi_monthly_rollups_month_year_idx
  ON public.kpi_monthly_rollups (month_year DESC);

CREATE INDEX IF NOT EXISTS kpi_monthly_rollups_employee_user_id_idx
  ON public.kpi_monthly_rollups (employee_user_id);

ALTER TABLE public.kpi_monthly_rollups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kpi_monthly_rollups_admin_select" ON public.kpi_monthly_rollups;
CREATE POLICY "kpi_monthly_rollups_admin_select"
  ON public.kpi_monthly_rollups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'manager', 'sales_manager')
    )
  );

DROP POLICY IF EXISTS "kpi_monthly_rollups_admin_update" ON public.kpi_monthly_rollups;
CREATE POLICY "kpi_monthly_rollups_admin_update"
  ON public.kpi_monthly_rollups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS public.chamber_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamber_id uuid REFERENCES public.chambers(id) ON DELETE SET NULL,
  chamber_name text,
  event_id uuid NOT NULL REFERENCES public.chamber_events(id) ON DELETE CASCADE,
  event_assignment_id uuid REFERENCES public.chamber_event_assignments(id) ON DELETE SET NULL,
  rep_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  manager_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  attended_on date NOT NULL,
  attendance_confirmed boolean NOT NULL DEFAULT true,
  contacts_made integer NOT NULL DEFAULT 0,
  inspections_generated integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, rep_user_id)
);

CREATE INDEX IF NOT EXISTS chamber_activity_logs_rep_user_id_idx
  ON public.chamber_activity_logs (rep_user_id);

CREATE INDEX IF NOT EXISTS chamber_activity_logs_event_id_idx
  ON public.chamber_activity_logs (event_id);

CREATE INDEX IF NOT EXISTS chamber_activity_logs_attended_on_idx
  ON public.chamber_activity_logs (attended_on DESC);

ALTER TABLE public.chamber_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chamber_activity_logs_admin_all" ON public.chamber_activity_logs;
CREATE POLICY "chamber_activity_logs_admin_all"
  ON public.chamber_activity_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "chamber_activity_logs_rep_select" ON public.chamber_activity_logs;
CREATE POLICY "chamber_activity_logs_rep_select"
  ON public.chamber_activity_logs
  FOR SELECT
  USING (rep_user_id = auth.uid());

DROP POLICY IF EXISTS "chamber_activity_logs_rep_insert" ON public.chamber_activity_logs;
CREATE POLICY "chamber_activity_logs_rep_insert"
  ON public.chamber_activity_logs
  FOR INSERT
  WITH CHECK (rep_user_id = auth.uid());

DROP POLICY IF EXISTS "chamber_activity_logs_rep_update" ON public.chamber_activity_logs;
CREATE POLICY "chamber_activity_logs_rep_update"
  ON public.chamber_activity_logs
  FOR UPDATE
  USING (rep_user_id = auth.uid())
  WITH CHECK (rep_user_id = auth.uid());

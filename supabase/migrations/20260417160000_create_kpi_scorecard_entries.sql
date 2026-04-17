-- =============================================================================
-- Weekly KPI scorecard entry storage
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kpi_scorecard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_role text NOT NULL,
  employee_name text NOT NULL,
  reviewer_name text NOT NULL,
  week_start_date date NOT NULL,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scores jsonb NOT NULL,
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kpi_scorecard_entries_role_idx
  ON public.kpi_scorecard_entries (scorecard_role);

CREATE INDEX IF NOT EXISTS kpi_scorecard_entries_week_idx
  ON public.kpi_scorecard_entries (week_start_date DESC);

CREATE INDEX IF NOT EXISTS kpi_scorecard_entries_assigned_user_idx
  ON public.kpi_scorecard_entries (assigned_user_id);

ALTER TABLE public.kpi_scorecard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kpi_scorecard_entries_select_scoped" ON public.kpi_scorecard_entries;
CREATE POLICY "kpi_scorecard_entries_select_scoped"
  ON public.kpi_scorecard_entries
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = assigned_user_id
    OR auth.uid() = submitted_by_user_id
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'manager', 'sales_manager')
    )
  );

DROP POLICY IF EXISTS "kpi_scorecard_entries_insert_scoped" ON public.kpi_scorecard_entries;
CREATE POLICY "kpi_scorecard_entries_insert_scoped"
  ON public.kpi_scorecard_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by_user_id
    AND (
      auth.uid() = assigned_user_id
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role::text IN ('admin', 'manager', 'sales_manager')
      )
    )
  );

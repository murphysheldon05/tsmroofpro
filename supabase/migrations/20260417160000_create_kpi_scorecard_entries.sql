-- =============================================================================
-- Weekly KPI scorecard entry storage
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.kpi_scorecard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_role text NOT NULL,
  employee_name text NOT NULL,
  reviewer_name text NOT NULL,
  week_start_date date NOT NULL,
  scores jsonb NOT NULL,
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kpi_scorecard_entries_role_idx
  ON public.kpi_scorecard_entries (scorecard_role);

CREATE INDEX IF NOT EXISTS kpi_scorecard_entries_week_idx
  ON public.kpi_scorecard_entries (week_start_date DESC);

ALTER TABLE public.kpi_scorecard_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kpi_scorecard_entries_select_authenticated" ON public.kpi_scorecard_entries;
CREATE POLICY "kpi_scorecard_entries_select_authenticated"
  ON public.kpi_scorecard_entries
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "kpi_scorecard_entries_insert_authenticated" ON public.kpi_scorecard_entries;
CREATE POLICY "kpi_scorecard_entries_insert_authenticated"
  ON public.kpi_scorecard_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

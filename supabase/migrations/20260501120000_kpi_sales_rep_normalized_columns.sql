-- =============================================================================
-- Normalized Sales Rep KPI columns on weekly scorecard entries
-- Single source of truth: kpi_scorecard_entries (+ scores JSON for compliance rollups / extras)
-- =============================================================================

ALTER TABLE public.kpi_scorecard_entries
  ADD COLUMN IF NOT EXISTS rep_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS week_end_date date,
  ADD COLUMN IF NOT EXISTS doors_knocked integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS one_to_ones boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_gen_1_2 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chamber_activities boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS social_media_posts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crm_hygiene boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sales_meeting_huddles boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS logged_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill typed columns from legacy scores JSON where present
UPDATE public.kpi_scorecard_entries
SET
  rep_id = COALESCE(
    NULLIF(trim(scores ->> 'rep_id'), '')::uuid,
    assigned_user_id
  ),
  week_end_date = week_start_date + 6,
  doors_knocked = COALESCE(
    NULLIF(trim(scores ->> 'doors_knocked'), '')::integer,
    NULLIF(trim(scores ->> 'salesrabbit'), '')::integer,
    0
  ),
  one_to_ones =
    CASE
      WHEN scores ? 'one_to_ones'
        THEN (scores ->> 'one_to_ones')::boolean
      WHEN scores ? 'one_to_one'
        THEN (scores ->> 'one_to_one')::boolean
      ELSE false
    END,
  lead_gen_1_2 =
    CASE
      WHEN scores ? 'lead_gen_1_2' THEN (scores ->> 'lead_gen_1_2')::boolean
      ELSE false
    END,
  chamber_activities =
    CASE
      WHEN scores ? 'chamber_activities' THEN (scores ->> 'chamber_activities')::boolean
      ELSE false
    END,
  social_media_posts = COALESCE(
    NULLIF(trim(scores ->> 'social_media_posts'), '')::integer,
    0
  ),
  crm_hygiene =
    CASE
      WHEN scores ? 'crm_hygiene' THEN (scores ->> 'crm_hygiene')::boolean
      WHEN scores ? 'acculynx_quality' THEN (scores ->> 'acculynx_quality')::boolean
      ELSE false
    END,
  sales_meeting_huddles =
    CASE
      WHEN scores ? 'sales_meeting_huddles' THEN (scores ->> 'sales_meeting_huddles')::boolean
      WHEN scores ? 'sales_meetings' THEN (scores ->> 'sales_meetings')::boolean
      ELSE false
    END,
  logged_by = COALESCE(logged_by, submitted_by_user_id)
WHERE scorecard_role = 'sales_rep';

CREATE INDEX IF NOT EXISTS idx_sales_rep_scorecard_rep_week
  ON public.kpi_scorecard_entries (assigned_user_id, week_start_date DESC)
  WHERE scorecard_role = 'sales_rep' AND assigned_user_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- RLS: allow managers to UPDATE scorecards they can already read
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "kpi_scorecard_entries_update_scoped" ON public.kpi_scorecard_entries;
CREATE POLICY "kpi_scorecard_entries_update_scoped"
  ON public.kpi_scorecard_entries
  FOR UPDATE
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
  )
  WITH CHECK (
    auth.uid() = assigned_user_id
    OR auth.uid() = submitted_by_user_id
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'manager', 'sales_manager')
    )
  );

-- =============================================================================
-- Migration: Replace iframe-based KPI scorecards with native scorecard system
-- =============================================================================

-- Drop old iframe-based KPI system
DROP POLICY IF EXISTS "Public read kpi scorecards" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload kpi scorecards" ON storage.objects;
DROP POLICY IF EXISTS "Admins update kpi scorecards" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete kpi scorecards" ON storage.objects;
DROP TABLE IF EXISTS public.kpi_scorecards CASCADE;
-- Do not DELETE from storage.objects / storage.buckets here — Supabase blocks direct
-- SQL deletes on storage tables (storage.protect_delete). If the legacy bucket
-- `kpi-scorecards` still exists, remove it in Dashboard → Storage, or via the Storage API / CLI.

-- =============================================================================
-- scorecard_templates
-- =============================================================================
CREATE TABLE public.scorecard_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  review_frequency text NOT NULL DEFAULT 'weekly'
    CHECK (review_frequency IN ('weekly', 'biweekly', 'monthly')),
  scoring_scale_max int NOT NULL DEFAULT 5,
  has_bonus boolean NOT NULL DEFAULT false,
  bonus_tiers jsonb,
  bonus_period text NOT NULL DEFAULT 'monthly'
    CHECK (bonus_period IN ('weekly', 'monthly', 'quarterly')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX scorecard_templates_status_idx
  ON public.scorecard_templates (status);
CREATE INDEX scorecard_templates_created_by_idx
  ON public.scorecard_templates (created_by);

CREATE TRIGGER update_scorecard_templates_updated_at
  BEFORE UPDATE ON public.scorecard_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- scorecard_kpis
-- =============================================================================
CREATE TABLE public.scorecard_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL
    REFERENCES public.scorecard_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  full_name text,
  description text,
  scoring_guide jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX scorecard_kpis_template_id_idx
  ON public.scorecard_kpis (template_id);
CREATE INDEX scorecard_kpis_sort_order_idx
  ON public.scorecard_kpis (template_id, sort_order);

-- =============================================================================
-- scorecard_assignments
-- =============================================================================
CREATE TABLE public.scorecard_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL
    REFERENCES public.scorecard_templates(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_ids uuid[] NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'removed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, employee_id)
);

CREATE INDEX scorecard_assignments_template_id_idx
  ON public.scorecard_assignments (template_id);
CREATE INDEX scorecard_assignments_employee_id_idx
  ON public.scorecard_assignments (employee_id);
CREATE INDEX scorecard_assignments_status_idx
  ON public.scorecard_assignments (status);

CREATE TRIGGER update_scorecard_assignments_updated_at
  BEFORE UPDATE ON public.scorecard_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- scorecard_submissions
-- =============================================================================
CREATE TABLE public.scorecard_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL
    REFERENCES public.scorecard_assignments(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  scores jsonb NOT NULL,
  average numeric(3,2) NOT NULL,
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, reviewer_id, period_start)
);

CREATE INDEX scorecard_submissions_assignment_id_idx
  ON public.scorecard_submissions (assignment_id);
CREATE INDEX scorecard_submissions_reviewer_id_idx
  ON public.scorecard_submissions (reviewer_id);
CREATE INDEX scorecard_submissions_period_idx
  ON public.scorecard_submissions (period_start, period_end);

-- =============================================================================
-- RLS: scorecard_templates
-- =============================================================================
ALTER TABLE public.scorecard_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scorecard_templates_select"
  ON public.scorecard_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "scorecard_templates_insert_admin"
  ON public.scorecard_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "scorecard_templates_update_admin"
  ON public.scorecard_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "scorecard_templates_delete_admin"
  ON public.scorecard_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =============================================================================
-- RLS: scorecard_kpis
-- =============================================================================
ALTER TABLE public.scorecard_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scorecard_kpis_select"
  ON public.scorecard_kpis FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "scorecard_kpis_insert_admin"
  ON public.scorecard_kpis FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "scorecard_kpis_update_admin"
  ON public.scorecard_kpis FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "scorecard_kpis_delete_admin"
  ON public.scorecard_kpis FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =============================================================================
-- RLS: scorecard_assignments
-- =============================================================================
ALTER TABLE public.scorecard_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scorecard_assignments_select"
  ON public.scorecard_assignments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR employee_id = auth.uid()
    OR auth.uid() = ANY(reviewer_ids)
  );

CREATE POLICY "scorecard_assignments_insert_admin"
  ON public.scorecard_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "scorecard_assignments_update_admin"
  ON public.scorecard_assignments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "scorecard_assignments_delete_admin"
  ON public.scorecard_assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =============================================================================
-- RLS: scorecard_submissions
-- =============================================================================
ALTER TABLE public.scorecard_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scorecard_submissions_select"
  ON public.scorecard_submissions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.scorecard_assignments sa
      WHERE sa.id = assignment_id
      AND (sa.employee_id = auth.uid() OR auth.uid() = ANY(sa.reviewer_ids))
    )
  );

CREATE POLICY "scorecard_submissions_insert"
  ON public.scorecard_submissions FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.scorecard_assignments sa
      WHERE sa.id = assignment_id
      AND auth.uid() = ANY(sa.reviewer_ids)
    )
  );

CREATE POLICY "scorecard_submissions_update"
  ON public.scorecard_submissions FOR UPDATE TO authenticated
  USING (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.scorecard_assignments sa
      WHERE sa.id = assignment_id
      AND auth.uid() = ANY(sa.reviewer_ids)
    )
  )
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.scorecard_assignments sa
      WHERE sa.id = assignment_id
      AND auth.uid() = ANY(sa.reviewer_ids)
    )
  );

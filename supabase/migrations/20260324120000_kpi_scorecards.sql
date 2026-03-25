-- KPI Scorecards: table, RLS, public storage bucket for self-hosted HTML scorecards

-- =============================================================================
-- TABLE
-- =============================================================================

CREATE TABLE public.kpi_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  storage_path text NOT NULL,
  assigned_reviewers uuid[] NULL,
  visible_to uuid[] NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX kpi_scorecards_status_idx ON public.kpi_scorecards (status);
CREATE INDEX kpi_scorecards_created_by_idx ON public.kpi_scorecards (created_by);

COMMENT ON TABLE public.kpi_scorecards IS 'KPI scorecard metadata; HTML files live in storage bucket kpi-scorecards';

-- updated_at
CREATE TRIGGER update_kpi_scorecards_updated_at
  BEFORE UPDATE ON public.kpi_scorecards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.kpi_scorecards ENABLE ROW LEVEL SECURITY;

-- SELECT: not removed; admins see all; others only if visible_to is non-empty and (uid in visible_to OR (manager/sales_manager AND uid in assigned_reviewers))
CREATE POLICY "kpi_scorecards_select"
  ON public.kpi_scorecards
  FOR SELECT
  TO authenticated
  USING (
    status <> 'removed'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (
        visible_to IS NOT NULL
        AND cardinality(visible_to) > 0
        AND (
          auth.uid() = ANY (visible_to)
          OR (
            (
              public.has_role(auth.uid(), 'manager'::public.app_role)
              OR public.has_role(auth.uid(), 'sales_manager'::public.app_role)
            )
            AND auth.uid() = ANY (COALESCE(assigned_reviewers, '{}'::uuid[]))
          )
        )
      )
    )
  );

CREATE POLICY "kpi_scorecards_insert_admin"
  ON public.kpi_scorecards
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "kpi_scorecards_update_admin"
  ON public.kpi_scorecards
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "kpi_scorecards_delete_admin"
  ON public.kpi_scorecards
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =============================================================================
-- STORAGE: public bucket (iframes load HTML without auth)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('kpi-scorecards', 'kpi-scorecards', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read kpi scorecards" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload kpi scorecards" ON storage.objects;
DROP POLICY IF EXISTS "Admins update kpi scorecards" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete kpi scorecards" ON storage.objects;

CREATE POLICY "Public read kpi scorecards"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'kpi-scorecards');

CREATE POLICY "Admins upload kpi scorecards"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kpi-scorecards'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins update kpi scorecards"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'kpi-scorecards'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins delete kpi scorecards"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kpi-scorecards'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

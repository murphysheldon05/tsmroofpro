-- Restrict native KPI template/KPI visibility to admins and assigned users.
-- This keeps scorecards private to admins, assigned employees, and assigned reviewers.

DROP POLICY IF EXISTS "scorecard_templates_select" ON public.scorecard_templates;
CREATE POLICY "scorecard_templates_select"
  ON public.scorecard_templates FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.scorecard_assignments sa
      WHERE sa.template_id = scorecard_templates.id
        AND sa.status = 'active'
        AND (
          sa.employee_id = auth.uid()
          OR auth.uid() = ANY(sa.reviewer_ids)
        )
    )
  );

DROP POLICY IF EXISTS "scorecard_kpis_select" ON public.scorecard_kpis;
CREATE POLICY "scorecard_kpis_select"
  ON public.scorecard_kpis FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.scorecard_assignments sa
      WHERE sa.template_id = scorecard_kpis.template_id
        AND sa.status = 'active'
        AND (
          sa.employee_id = auth.uid()
          OR auth.uid() = ANY(sa.reviewer_ids)
        )
    )
  );

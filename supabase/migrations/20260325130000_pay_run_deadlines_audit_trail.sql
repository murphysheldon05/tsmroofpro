-- Pay Run Deadlines & Audit Trail
-- Adds Saturday-Friday period model to commission_pay_runs,
-- new columns on commission_documents, and a commission_audit_log table.

-- ═══════════════════════════════════════════════════════════════
-- 1. ALTER commission_pay_runs: add period columns
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.commission_pay_runs
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS submission_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revision_deadline TIMESTAMPTZ;

COMMENT ON COLUMN public.commission_pay_runs.period_start IS 'Saturday start of the pay run week (MST midnight)';
COMMENT ON COLUMN public.commission_pay_runs.period_end IS 'Friday end of the pay run week';
COMMENT ON COLUMN public.commission_pay_runs.submission_deadline IS 'Tuesday 3:00 PM MST (stored as UTC) — initial submission cutoff';
COMMENT ON COLUMN public.commission_pay_runs.revision_deadline IS 'Wednesday 12:00 PM MST (stored as UTC) — revision resubmission cutoff';

-- Backfill existing rows: run_date is a Friday, so period_end = run_date, period_start = run_date - 6
UPDATE public.commission_pay_runs
SET
  period_end   = run_date,
  period_start = run_date - INTERVAL '6 days',
  -- Tuesday of that week = run_date - 3 days, at 3PM MST = 10PM UTC
  submission_deadline = (run_date - INTERVAL '3 days')::DATE::TIMESTAMPTZ + INTERVAL '22 hours',
  -- Wednesday of that week = run_date - 2 days, at noon MST = 7PM UTC
  revision_deadline   = (run_date - INTERVAL '2 days')::DATE::TIMESTAMPTZ + INTERVAL '19 hours'
WHERE period_start IS NULL;

-- Unique constraint on period_start (one pay run per week)
CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_pay_runs_period_start
  ON public.commission_pay_runs (period_start);

-- ═══════════════════════════════════════════════════════════════
-- 2. ALTER commission_documents: add pay run and audit columns
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.commission_documents
  ADD COLUMN IF NOT EXISTS pay_run_id UUID REFERENCES public.commission_pay_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS install_date DATE,
  ADD COLUMN IF NOT EXISTS is_late_submission BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_late_revision BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rolled_from_pay_run_id UUID REFERENCES public.commission_pay_runs(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.commission_documents.pay_run_id IS 'Which pay run (Saturday-Friday) this commission is assigned to';
COMMENT ON COLUMN public.commission_documents.install_date IS 'Date the roof installation was completed';
COMMENT ON COLUMN public.commission_documents.is_late_submission IS 'True if submitted after Tuesday 3:00 PM MST deadline';
COMMENT ON COLUMN public.commission_documents.is_late_revision IS 'True if revision resubmitted after Wednesday noon MST deadline';
COMMENT ON COLUMN public.commission_documents.rolled_from_pay_run_id IS 'Original pay run if this commission was bumped due to late submission/revision';

CREATE INDEX IF NOT EXISTS idx_commission_documents_pay_run_id ON public.commission_documents(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_commission_documents_install_date ON public.commission_documents(install_date);

-- Backfill pay_run_id from existing scheduled_pay_date where possible
UPDATE public.commission_documents cd
SET pay_run_id = pr.id
FROM public.commission_pay_runs pr
WHERE cd.scheduled_pay_date IS NOT NULL
  AND cd.pay_run_id IS NULL
  AND pr.run_date = cd.scheduled_pay_date::DATE;

-- ═══════════════════════════════════════════════════════════════
-- 3. CREATE commission_audit_log
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.commission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES public.commission_documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details JSONB,
  pay_run_id UUID REFERENCES public.commission_pay_runs(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.commission_audit_log IS 'Full history of every action taken on a commission document';

CREATE INDEX IF NOT EXISTS idx_commission_audit_log_commission_id ON public.commission_audit_log(commission_id);
CREATE INDEX IF NOT EXISTS idx_commission_audit_log_performed_at ON public.commission_audit_log(performed_at);

ALTER TABLE public.commission_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can SELECT all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.commission_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can SELECT audit logs for their own commissions
CREATE POLICY "Users can view own commission audit logs"
  ON public.commission_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.commission_documents cd
      WHERE cd.id = commission_audit_log.commission_id
        AND cd.created_by = auth.uid()
    )
  );

-- Reviewers can SELECT audit logs for commissions they review
CREATE POLICY "Reviewers can view audit logs"
  ON public.commission_audit_log FOR SELECT TO authenticated
  USING (public.is_commission_reviewer(auth.uid()));

-- Authenticated users can INSERT audit logs (application-level inserts)
CREATE POLICY "Authenticated can insert audit logs"
  ON public.commission_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 4. Update get_or_create_pay_run helper for period-based model
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_or_create_pay_run_for_period(p_period_start DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  run_id UUID;
  p_period_end DATE;
  p_run_date DATE;
  p_sub_deadline TIMESTAMPTZ;
  p_rev_deadline TIMESTAMPTZ;
BEGIN
  SELECT id INTO run_id FROM commission_pay_runs WHERE period_start = p_period_start LIMIT 1;
  IF run_id IS NOT NULL THEN
    RETURN run_id;
  END IF;

  p_period_end    := p_period_start + INTERVAL '6 days';
  p_run_date      := p_period_end; -- Friday = run_date for backward compat
  -- Tuesday = period_start + 3 days, 3PM MST = 10PM UTC
  p_sub_deadline  := (p_period_start + INTERVAL '3 days')::DATE::TIMESTAMPTZ + INTERVAL '22 hours';
  -- Wednesday = period_start + 4 days, noon MST = 7PM UTC
  p_rev_deadline  := (p_period_start + INTERVAL '4 days')::DATE::TIMESTAMPTZ + INTERVAL '19 hours';

  INSERT INTO commission_pay_runs (run_date, period_start, period_end, submission_deadline, revision_deadline, status)
  VALUES (p_run_date, p_period_start, p_period_end, p_sub_deadline, p_rev_deadline, 'open')
  ON CONFLICT (period_start) DO NOTHING
  RETURNING id INTO run_id;

  -- If the ON CONFLICT hit, fetch the existing row
  IF run_id IS NULL THEN
    SELECT id INTO run_id FROM commission_pay_runs WHERE period_start = p_period_start LIMIT 1;
  END IF;

  RETURN run_id;
END;
$$;

-- Pay run date = the Friday AFTER the period ends (period_end + 7).
-- Previously run_date equalled period_end; now it's the following Friday
-- so the pay cycle Apr 11-17 has pay date Apr 24, etc.

-- 1. Update the DB function that creates/upserts pay runs
CREATE OR REPLACE FUNCTION get_or_create_pay_run_for_period(p_period_start DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_period_end DATE;
  v_run_date DATE;
  v_submission_deadline TIMESTAMPTZ;
  v_revision_deadline TIMESTAMPTZ;
BEGIN
  -- Period end is Friday (start + 6 days)
  v_period_end := p_period_start + 6;

  -- Pay run date is the Friday AFTER the period ends
  v_run_date := v_period_end + 7;

  -- Submission deadline: Friday 11:59 PM MST (UTC-7)
  v_submission_deadline := (v_period_end::TIMESTAMP + INTERVAL '23 hours 59 minutes')
                           AT TIME ZONE 'America/Phoenix';

  -- Correction deadline: Wednesday noon MST of the week AFTER the pay run period
  v_revision_deadline := ((p_period_start + 11)::TIMESTAMP + INTERVAL '12 hours')
                          AT TIME ZONE 'America/Phoenix';

  -- Atomic upsert
  INSERT INTO commission_pay_runs (period_start, period_end, run_date, submission_deadline, revision_deadline, status)
  VALUES (p_period_start, v_period_end, v_run_date, v_submission_deadline, v_revision_deadline, 'open')
  ON CONFLICT (period_start) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM commission_pay_runs WHERE period_start = p_period_start;
  END IF;

  RETURN v_id;
END;
$$;

-- 2. Backfill existing pay runs: shift run_date forward by 7 days
UPDATE commission_pay_runs
SET run_date = period_end + 7
WHERE run_date = period_end;

-- 3. Backfill scheduled_pay_date on commission_documents that still point to
--    the old period-end Friday.  New value = old value + 7 days.
UPDATE commission_documents cd
SET scheduled_pay_date = (cd.scheduled_pay_date::DATE + 7)::TEXT
WHERE cd.scheduled_pay_date IS NOT NULL
  AND cd.pay_run_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM commission_pay_runs pr
    WHERE pr.id = cd.pay_run_id
      AND pr.period_end::TEXT = cd.scheduled_pay_date
  );

-- Simplify commission deadlines:
--   Remove Friday-close grace period (Monday noon)
--   Change revision deadline from Wednesday noon to Tuesday 11:59 PM
--   Submission cutoff (Friday 11:59 PM) and pay date (following Friday) unchanged

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
  v_period_end := p_period_start + 6;
  v_run_date := v_period_end + 7;

  -- Submission deadline: Friday 11:59 PM MST (UTC-7)
  v_submission_deadline := (v_period_end::TIMESTAMP + INTERVAL '23 hours 59 minutes')
                           AT TIME ZONE 'America/Phoenix';

  -- Revision grace: Tuesday 11:59 PM MST (day +10 from Saturday start)
  v_revision_deadline := ((p_period_start + 10)::TIMESTAMP + INTERVAL '23 hours 59 minutes')
                          AT TIME ZONE 'America/Phoenix';

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

-- 2. Backfill revision_deadline on existing open pay runs to Tuesday 11:59 PM MST
UPDATE commission_pay_runs
SET revision_deadline = ((period_start + 10)::TIMESTAMP + INTERVAL '23 hours 59 minutes')
                         AT TIME ZONE 'America/Phoenix'
WHERE status = 'open';

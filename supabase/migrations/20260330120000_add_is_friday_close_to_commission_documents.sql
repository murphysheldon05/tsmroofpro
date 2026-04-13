-- Add is_friday_close flag to commission_documents for Friday-close exception handling
ALTER TABLE commission_documents
  ADD COLUMN IF NOT EXISTS is_friday_close BOOLEAN DEFAULT false;

-- Update the get_or_create_pay_run_for_period function to use the new Friday 11:59 PM deadline
CREATE OR REPLACE FUNCTION get_or_create_pay_run_for_period(p_period_start DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_period_end DATE;
  v_submission_deadline TIMESTAMPTZ;
  v_revision_deadline TIMESTAMPTZ;
BEGIN
  -- Period end is Friday (start + 6 days)
  v_period_end := p_period_start + 6;

  -- Submission deadline: Friday 11:59 PM MST (UTC-7)
  -- Friday = period_start + 6 days, 23:59 MST = 06:59 next day UTC
  v_submission_deadline := (v_period_end + 1)::TIMESTAMP AT TIME ZONE 'America/Phoenix'
                           - INTERVAL '1 minute';
  -- Simpler: Friday 23:59 Phoenix = Saturday 06:59 UTC
  v_submission_deadline := (v_period_end::TIMESTAMP + INTERVAL '23 hours 59 minutes')
                           AT TIME ZONE 'America/Phoenix';

  -- Correction deadline: Wednesday noon MST of the week AFTER the pay run
  -- Wednesday = period_start + 11 days, 12:00 PM MST
  v_revision_deadline := ((p_period_start + 11)::TIMESTAMP + INTERVAL '12 hours')
                          AT TIME ZONE 'America/Phoenix';

  -- Atomic upsert
  INSERT INTO commission_pay_runs (period_start, period_end, run_date, submission_deadline, revision_deadline, status)
  VALUES (p_period_start, v_period_end, v_period_end, v_submission_deadline, v_revision_deadline, 'open')
  ON CONFLICT (period_start) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM commission_pay_runs WHERE period_start = p_period_start;
  END IF;

  RETURN v_id;
END;
$$;

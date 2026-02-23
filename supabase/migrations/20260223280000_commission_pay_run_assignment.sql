-- Add scheduled_pay_date and pay_run_id to commission_submissions
-- Pay run is assigned at submission time based on Tuesday 3:00 PM MST cutoff:
-- Submitted by Tue 3PM MST = this week's pay run (Friday)
-- Submitted after Tue 3PM MST = next week's pay run (Friday)

ALTER TABLE public.commission_submissions
ADD COLUMN IF NOT EXISTS scheduled_pay_date DATE,
ADD COLUMN IF NOT EXISTS pay_run_id UUID REFERENCES public.commission_pay_runs(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.commission_submissions.scheduled_pay_date IS 'Friday pay date assigned at submission based on Tue 3PM MST cutoff. Reps can always submit; this determines which pay run they get.';
COMMENT ON COLUMN public.commission_submissions.pay_run_id IS 'Pay run assigned at submission time based on Tuesday 3:00 PM MST cutoff.';

CREATE INDEX IF NOT EXISTS idx_commission_submissions_pay_run_id ON public.commission_submissions(pay_run_id);
CREATE INDEX IF NOT EXISTS idx_commission_submissions_scheduled_pay_date ON public.commission_submissions(scheduled_pay_date);

-- Function: Calculate Friday pay date from timestamp using Tuesday 3:00 PM MST cutoff
CREATE OR REPLACE FUNCTION public.calculate_pay_date_from_timestamp_mst(ts TIMESTAMPTZ)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  mst_ts TIMESTAMPTZ;
  dow INT;
  hr INT;
  is_before BOOLEAN;
  days_add INT;
  base_date DATE;
BEGIN
  -- MST = UTC-7 (no DST per user requirement)
  mst_ts := ts + interval '-7 hours';
  dow := EXTRACT(DOW FROM mst_ts)::INT;  -- 0=Sun, 1=Mon, 2=Tue, ...
  hr := EXTRACT(HOUR FROM mst_ts)::INT;

  -- Before deadline: Sun, Mon, or Tue before 3 PM
  is_before := (dow < 2) OR (dow = 2 AND hr < 15);

  -- Days until Friday (5)
  days_add := (5 - dow + 7) % 7;
  IF days_add = 0 THEN days_add := 7; END IF;
  IF NOT is_before THEN days_add := days_add + 7; END IF;

  base_date := (mst_ts AT TIME ZONE 'UTC')::DATE;
  RETURN base_date + days_add;
END;
$$;

-- Function: Get or create pay run for a given Friday date (SECURITY DEFINER so reps can trigger)
CREATE OR REPLACE FUNCTION public.get_or_create_pay_run_for_date(pay_date DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  run_id UUID;
BEGIN
  SELECT id INTO run_id FROM commission_pay_runs WHERE run_date = pay_date LIMIT 1;
  IF run_id IS NOT NULL THEN
    RETURN run_id;
  END IF;
  INSERT INTO commission_pay_runs (run_date, status)
  VALUES (pay_date, 'open')
  RETURNING id INTO run_id;
  RETURN run_id;
END;
$$;

-- Trigger: Assign scheduled_pay_date and pay_run_id on commission submission
CREATE OR REPLACE FUNCTION public.assign_commission_pay_run_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_ts TIMESTAMPTZ;
  pay_date DATE;
BEGIN
  sub_ts := COALESCE(NEW.created_at, now());
  pay_date := calculate_pay_date_from_timestamp_mst(sub_ts);
  NEW.scheduled_pay_date := pay_date;
  NEW.pay_run_id := get_or_create_pay_run_for_date(pay_date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_commission_pay_run_trigger ON public.commission_submissions;
CREATE TRIGGER assign_commission_pay_run_trigger
BEFORE INSERT ON public.commission_submissions
FOR EACH ROW
EXECUTE FUNCTION public.assign_commission_pay_run_on_insert();

-- Backfill existing records that have NULL pay_run_id (use created_at for calculation)
UPDATE public.commission_submissions cs
SET
  scheduled_pay_date = sub.pay_date,
  pay_run_id = sub.run_id
FROM (
  SELECT
    cs2.id,
    calculate_pay_date_from_timestamp_mst(cs2.created_at) AS pay_date,
    get_or_create_pay_run_for_date(calculate_pay_date_from_timestamp_mst(cs2.created_at)) AS run_id
  FROM public.commission_submissions cs2
  WHERE cs2.pay_run_id IS NULL
) sub
WHERE cs.id = sub.id;

-- Rename 'Revisions' to 'Rejected' everywhere: database value and RLS policies.
-- Status label and UI: commission_submissions status 'revision_required' becomes 'rejected'.

-- 1. Drop any CHECK constraint on commission_submissions.status (name may be auto-generated)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.commission_submissions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.commission_submissions DROP CONSTRAINT %I', cname);
  END IF;
END $$;

-- 2. Migrate existing data: revision_required -> rejected (before adding new constraint)
UPDATE public.commission_submissions
SET status = 'rejected'
WHERE status = 'revision_required';

-- 3. Add updated check: rejected replaces revision_required
ALTER TABLE public.commission_submissions
ADD CONSTRAINT commission_submissions_status_check
CHECK (status IN ('pending_review', 'rejected', 'approved', 'denied', 'paid', 'on_hold', 'approved_for_payment'));

-- 4. RLS: Submitters can update own submissions when rejected or denied (was revision_required)
DROP POLICY IF EXISTS "Submitters can update own submissions needing revision" ON public.commission_submissions;

CREATE POLICY "Submitters can update own submissions needing revision"
ON public.commission_submissions
FOR UPDATE
TO authenticated
USING (
  is_active_employee(auth.uid())
  AND submitted_by = auth.uid()
  AND status = ANY (ARRAY['rejected', 'denied'])
)
WITH CHECK (
  is_active_employee(auth.uid())
  AND submitted_by = auth.uid()
  AND status = ANY (ARRAY['rejected', 'denied', 'pending_review'])
);

-- Fix: Allow submitters to edit and resubmit denied commissions (not just revision_required)
-- The USING clause was missing 'denied' status, so the edit button appeared but the save failed silently.

DROP POLICY IF EXISTS "Submitters can update own submissions needing revision" ON public.commission_submissions;

CREATE POLICY "Submitters can update own submissions needing revision"
ON public.commission_submissions
FOR UPDATE
TO authenticated
USING (
  is_active_employee(auth.uid())
  AND submitted_by = auth.uid()
  AND status = ANY (ARRAY['revision_required', 'denied'])
)
WITH CHECK (
  is_active_employee(auth.uid())
  AND submitted_by = auth.uid()
  AND status = ANY (ARRAY['revision_required', 'denied', 'pending_review'])
);

-- Also allow admin to delete commissions (for testing/cleanup)
DROP POLICY IF EXISTS "Admins can delete commissions" ON public.commission_submissions;

CREATE POLICY "Admins can delete commissions"
ON public.commission_submissions
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

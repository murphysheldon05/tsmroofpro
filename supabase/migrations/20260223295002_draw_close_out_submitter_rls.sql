-- Allow submitters to close out their own paid draws (convert to final commission)
-- Without this policy, the draw close-out flow fails at RLS: submitter updates status paid -> pending_review.

CREATE POLICY "Submitters can close out own paid draws"
ON public.commission_submissions
FOR UPDATE
TO authenticated
USING (
  is_active_employee(auth.uid())
  AND submitted_by = auth.uid()
  AND status = 'paid'
  AND COALESCE(is_draw, false) = true
  AND COALESCE(draw_closed_out, false) = false
)
WITH CHECK (
  is_active_employee(auth.uid())
  AND submitted_by = auth.uid()
  AND status = 'pending_review'
);

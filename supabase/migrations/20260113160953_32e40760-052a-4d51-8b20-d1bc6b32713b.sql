-- Allow submitters to update their own submissions when revision is required
CREATE POLICY "Submitters can update own submissions needing revision"
ON public.commission_submissions
FOR UPDATE
USING (
  submitted_by = auth.uid() 
  AND status = 'revision_required'
)
WITH CHECK (
  submitted_by = auth.uid()
  AND status IN ('revision_required', 'pending_review')
);
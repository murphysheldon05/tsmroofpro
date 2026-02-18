
-- Sales reps can view their OWN commission entries (via linked commission_reps.user_id)
CREATE POLICY "Reps can view own entries"
ON public.commission_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.commission_reps cr
    WHERE cr.id = commission_entries.rep_id
    AND cr.user_id = auth.uid()
  )
);

-- Sales reps can view their own commission_reps record
CREATE POLICY "Reps can view own rep record"
ON public.commission_reps
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- All authenticated users can view pay runs (needed for display)
CREATE POLICY "Authenticated can view pay runs"
ON public.commission_pay_runs
FOR SELECT
TO authenticated
USING (true);

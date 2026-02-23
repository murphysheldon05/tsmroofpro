-- Fix Commission Tracker: sales_manager role was blocked by RLS
-- The app treats sales_manager as manager (isManager includes both), but RLS only allowed admin/manager.
-- This caused Commission Tracker to return empty data for sales_managers viewing their team.

-- commission_reps: add sales_manager to "Admins and managers can view"
DROP POLICY IF EXISTS "Admins and managers can view commission_reps" ON public.commission_reps;
CREATE POLICY "Admins and managers can view commission_reps" ON public.commission_reps
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'sales_manager')
  );

-- commission_entries: add sales_manager to "Admins and managers can view entries"
DROP POLICY IF EXISTS "Admins and managers can view entries" ON public.commission_entries;
CREATE POLICY "Admins and managers can view entries" ON public.commission_entries
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'sales_manager')
  );

-- Note: commission_pay_runs already has "Authenticated can view pay runs" (all users) from migration 20260218053656

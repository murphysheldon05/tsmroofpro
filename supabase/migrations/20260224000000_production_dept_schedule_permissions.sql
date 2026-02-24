-- Production department users can UPDATE (edit) build and delivery schedule entries
-- but cannot INSERT or DELETE (admin/manager only for create/delete)
--
-- Users with department = 'Production' (Dustin, Tim, Anakin, and any future production users)
-- can: edit existing entries, mark jobs started/in progress/complete, add notes
-- cannot: create new entries, delete entries

-- production_calendar_events: Allow production department to UPDATE
DROP POLICY IF EXISTS "Managers and admins can update calendar events" ON public.production_calendar_events;
CREATE POLICY "Managers admins and production can update calendar events"
ON public.production_calendar_events
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'sales_manager') OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.department = 'Production' OR p.department_id IN (SELECT id FROM public.departments WHERE name = 'Production')))
);

-- delivery_calendar_events: Allow production department to UPDATE
DROP POLICY IF EXISTS "Managers and admins can update delivery events" ON public.delivery_calendar_events;
CREATE POLICY "Managers admins and production can update delivery events"
ON public.delivery_calendar_events
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'sales_manager') OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.department = 'Production' OR p.department_id IN (SELECT id FROM public.departments WHERE name = 'Production')))
);

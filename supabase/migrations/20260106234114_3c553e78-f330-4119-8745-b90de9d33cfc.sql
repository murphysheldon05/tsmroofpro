-- Update production_calendar_events table RLS policy to require authentication
-- Only authenticated users can view production calendar events

DROP POLICY IF EXISTS "Anyone can view production calendar events" ON public.production_calendar_events;

CREATE POLICY "Authenticated users can view production calendar events" 
ON public.production_calendar_events 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);
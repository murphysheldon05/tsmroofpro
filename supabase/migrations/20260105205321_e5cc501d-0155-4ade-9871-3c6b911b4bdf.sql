-- Create production calendar events table
CREATE TABLE public.production_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  all_day BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_calendar_events ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view events
CREATE POLICY "Anyone can view production calendar events"
ON public.production_calendar_events
FOR SELECT
USING (true);

-- Only managers and admins can insert events
CREATE POLICY "Managers and admins can insert calendar events"
ON public.production_calendar_events
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Only managers and admins can update events
CREATE POLICY "Managers and admins can update calendar events"
ON public.production_calendar_events
FOR UPDATE
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Only managers and admins can delete events
CREATE POLICY "Managers and admins can delete calendar events"
ON public.production_calendar_events
FOR DELETE
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));
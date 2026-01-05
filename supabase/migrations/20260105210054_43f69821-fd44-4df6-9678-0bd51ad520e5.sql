-- Add event_category column to production_calendar_events
ALTER TABLE public.production_calendar_events 
ADD COLUMN event_category text NOT NULL DEFAULT 'other';

-- Add a comment for documentation
COMMENT ON COLUMN public.production_calendar_events.event_category IS 'Category for color-coding: new_install, repair, inspection, maintenance, delivery, other';
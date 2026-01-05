-- Create crews table for production teams
CREATE TABLE public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crews
CREATE POLICY "Anyone can view active crews"
ON public.crews
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins and managers can manage crews"
ON public.crews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Add crew_id to production_calendar_events
ALTER TABLE public.production_calendar_events 
ADD COLUMN crew_id uuid REFERENCES public.crews(id) ON DELETE SET NULL;

-- Create delivery_calendar_events table (separate from production)
CREATE TABLE public.delivery_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  all_day boolean DEFAULT true,
  crew_id uuid REFERENCES public.crews(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for delivery events
ALTER TABLE public.delivery_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery events
CREATE POLICY "Anyone can view delivery calendar events"
ON public.delivery_calendar_events
FOR SELECT
USING (true);

CREATE POLICY "Managers and admins can insert delivery events"
ON public.delivery_calendar_events
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers and admins can update delivery events"
ON public.delivery_calendar_events
FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers and admins can delete delivery events"
ON public.delivery_calendar_events
FOR DELETE
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Insert default crews with different colors
INSERT INTO public.crews (name, color, sort_order) VALUES
('Crew 1', '#3b82f6', 1),  -- Blue
('Crew 2', '#10b981', 2),  -- Emerald
('Crew 3', '#f59e0b', 3),  -- Amber
('Crew 4', '#ef4444', 4),  -- Red
('Crew 5', '#8b5cf6', 5),  -- Violet
('Crew 6', '#ec4899', 6);  -- Pink

-- Trigger for updated_at
CREATE TRIGGER update_crews_updated_at
BEFORE UPDATE ON public.crews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_events_updated_at
BEFORE UPDATE ON public.delivery_calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
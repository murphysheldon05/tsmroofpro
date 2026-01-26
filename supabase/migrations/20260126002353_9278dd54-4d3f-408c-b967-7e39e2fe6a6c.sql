-- Create today_labor table for AccuLynx synced labor/build events
CREATE TABLE public.today_labor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id TEXT NOT NULL,
  job_name TEXT NOT NULL,
  address_full TEXT NOT NULL,
  scheduled_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  roof_type TEXT,
  squares NUMERIC,
  map_url TEXT NOT NULL,
  acculynx_job_url TEXT NOT NULL,
  source_event_id TEXT NOT NULL UNIQUE,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create today_deliveries table for AccuLynx synced delivery events
CREATE TABLE public.today_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id TEXT NOT NULL,
  job_name TEXT NOT NULL,
  address_full TEXT NOT NULL,
  scheduled_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  map_url TEXT NOT NULL,
  acculynx_job_url TEXT NOT NULL,
  source_event_id TEXT NOT NULL UNIQUE,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_today_labor_scheduled ON public.today_labor(scheduled_datetime);
CREATE INDEX idx_today_deliveries_scheduled ON public.today_deliveries(scheduled_datetime);

-- Enable RLS
ALTER TABLE public.today_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.today_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All authenticated users can view (read-only display)
CREATE POLICY "Authenticated users can view today labor" 
ON public.today_labor 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view today deliveries" 
ON public.today_deliveries 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Only service role (edge functions) can insert/update/delete
CREATE POLICY "Service role can manage today labor" 
ON public.today_labor 
FOR ALL 
USING (auth.uid() IS NULL);

CREATE POLICY "Service role can manage today deliveries" 
ON public.today_deliveries 
FOR ALL 
USING (auth.uid() IS NULL);
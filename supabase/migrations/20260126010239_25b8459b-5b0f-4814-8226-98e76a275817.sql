-- Add new map URL columns for primary (OpenStreetMap) and Google fallback
-- Rename existing map_url to map_url_primary and add map_url_google

-- For today_labor table
ALTER TABLE public.today_labor 
  RENAME COLUMN map_url TO map_url_primary;

ALTER TABLE public.today_labor 
  ADD COLUMN map_url_google TEXT;

-- For today_deliveries table
ALTER TABLE public.today_deliveries 
  RENAME COLUMN map_url TO map_url_primary;

ALTER TABLE public.today_deliveries 
  ADD COLUMN map_url_google TEXT;
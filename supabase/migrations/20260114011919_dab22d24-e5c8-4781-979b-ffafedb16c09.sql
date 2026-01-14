-- Add weather location preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weather_location_lat numeric DEFAULT 33.4484,
ADD COLUMN IF NOT EXISTS weather_location_lon numeric DEFAULT -112.0740,
ADD COLUMN IF NOT EXISTS weather_location_name text DEFAULT 'Phoenix, AZ';
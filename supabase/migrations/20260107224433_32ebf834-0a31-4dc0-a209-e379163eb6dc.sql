-- Add iOS and Android app store URL columns to tools table
ALTER TABLE public.tools 
ADD COLUMN ios_app_url TEXT,
ADD COLUMN android_app_url TEXT;
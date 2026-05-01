-- Training Hub: optional per-video description and Loom thumbnail URL for custom catalog rows

ALTER TABLE public.training_hub_custom_videos
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add bio fields to user profiles
-- Personal hobbies, background info, and company phone number

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personal_hobbies text,
  ADD COLUMN IF NOT EXISTS background_info text,
  ADD COLUMN IF NOT EXISTS company_phone text;


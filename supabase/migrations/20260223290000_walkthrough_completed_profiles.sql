-- Add walkthrough_completed flag to profiles for app-wide guided tour
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS walkthrough_completed boolean DEFAULT false;

-- Existing users: mark as completed so they don't get auto-launch (only new users get the tour)
UPDATE public.profiles SET walkthrough_completed = true;

COMMENT ON COLUMN public.profiles.walkthrough_completed IS 'Set true after user completes the in-app guided walkthrough; prevents auto-launch on subsequent logins.';

-- One-time admin notification per user when they complete first Master Playbook acknowledgment.
-- Prevents repeat admin emails; remove any "on open" behavior by relying on this flag only.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS playbook_acknowledged boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.playbook_acknowledged IS 'Set true after admin has been notified once that this user completed Master Playbook; prevents repeat admin emails.';

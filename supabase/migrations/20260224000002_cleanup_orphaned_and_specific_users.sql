-- Cleanup orphaned pending_approvals and remove specific users for re-invite
-- Run in Supabase SQL Editor

-- STEP 1: Remove orphaned pending_approvals (rows where profile no longer exists or is already approved)
DELETE FROM public.pending_approvals
WHERE entity_type = 'user'
  AND status = 'pending'
  AND (
    entity_id NOT IN (SELECT id FROM public.profiles)
    OR entity_id IN (SELECT id FROM public.profiles WHERE is_approved = true)
  );

-- STEP 2: Remove Sheldon Murphy (Yahoo) and CourtneyLee94 (Outlook) so they can be re-invited
-- Uses case-insensitive email match; adjust if your emails differ
DO $$
DECLARE
  profile_rec RECORD;
BEGIN
  FOR profile_rec IN
    SELECT id FROM public.profiles
    WHERE LOWER(TRIM(email)) IN (
      'sheldonmurphy714@yahoo.com',
      'courtneylee94@outlook.com'
    )
  LOOP
    DELETE FROM public.pending_approvals
    WHERE entity_type = 'user' AND entity_id = profile_rec.id;
    DELETE FROM public.profiles WHERE id = profile_rec.id;
  END LOOP;
END $$;

-- IMPORTANT: Delete auth.users for those emails via Supabase Dashboard:
-- Auth > Users > search by email > Delete. Otherwise they cannot sign up again.

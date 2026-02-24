-- Backfill pending_approvals for profiles that need approval but don't have a row.
-- Fixes the bug where users who sign up sometimes don't appear in Pending Approvals
-- (e.g. when the create_pending_approval_for_new_user trigger fails or races).
INSERT INTO public.pending_approvals (entity_type, entity_id, status, submitted_by, submitted_at, assigned_to_role, notes)
SELECT 
  'user'::text,
  p.id,
  'pending'::text,
  p.id,
  p.created_at,
  'admin'::text,
  'Backfilled: profile needed approval but had no pending_approval row'
FROM public.profiles p
WHERE p.is_approved = false
  AND NOT EXISTS (
    SELECT 1 FROM public.pending_approvals pa
    WHERE pa.entity_type = 'user' AND pa.entity_id = p.id AND pa.status = 'pending'
  )
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- =============================================================
-- Add production_manager role for warranty pipeline management
-- =============================================================

-- 1. Add 'production_manager' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'production_manager';

-- 2. Fix warranty_requests status CHECK constraint to include 'closed'
--    (The original constraint excluded 'closed', which broke the close/archive flow)
ALTER TABLE public.warranty_requests DROP CONSTRAINT IF EXISTS warranty_requests_status_check;
ALTER TABLE public.warranty_requests ADD CONSTRAINT warranty_requests_status_check
  CHECK (status IN (
    'new', 'assigned', 'in_review', 'scheduled', 'in_progress',
    'waiting_on_materials', 'waiting_on_manufacturer',
    'completed', 'denied', 'closed'
  ));

-- 3. Update get_user_role() to include production_manager in priority ordering
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'accounting' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'production_manager' THEN 4
      WHEN 'sales_manager' THEN 5
      WHEN 'ops_compliance' THEN 6
      WHEN 'sales_rep' THEN 7
      WHEN 'employee' THEN 8
    END
  LIMIT 1
$function$;

-- 4. Add RLS policies so production_managers can manage warranty data
CREATE POLICY "Production managers can manage all warranties"
ON public.warranty_requests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'production_manager'))
WITH CHECK (has_role(auth.uid(), 'production_manager'));

CREATE POLICY "Production managers can manage warranty notes"
ON public.warranty_notes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'production_manager'))
WITH CHECK (has_role(auth.uid(), 'production_manager'));

CREATE POLICY "Production managers can manage warranty documents"
ON public.warranty_documents
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'production_manager'))
WITH CHECK (has_role(auth.uid(), 'production_manager'));

CREATE POLICY "Production managers can manage warranty watchers"
ON public.warranty_watchers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'production_manager'))
WITH CHECK (has_role(auth.uid(), 'production_manager'));

-- 5. Set Tim Brown and Dustin Denmark as production_manager
--    Uses name lookup so we don't hardcode UUIDs
DO $$
DECLARE
  v_uid uuid;
BEGIN
  -- Tim Brown
  SELECT id INTO v_uid FROM public.profiles
    WHERE lower(full_name) LIKE '%tim%brown%' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    UPDATE public.user_roles SET role = 'production_manager' WHERE user_id = v_uid;
    IF NOT FOUND THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'production_manager');
    END IF;
    RAISE NOTICE 'Set Tim Brown (%) to production_manager', v_uid;
  ELSE
    RAISE NOTICE 'Tim Brown not found in profiles — skipping';
  END IF;

  -- Dustin Denmark
  v_uid := NULL;
  SELECT id INTO v_uid FROM public.profiles
    WHERE lower(full_name) LIKE '%dustin%denmark%' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    UPDATE public.user_roles SET role = 'production_manager' WHERE user_id = v_uid;
    IF NOT FOUND THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'production_manager');
    END IF;
    RAISE NOTICE 'Set Dustin Denmark (%) to production_manager', v_uid;
  ELSE
    RAISE NOTICE 'Dustin Denmark not found in profiles — skipping';
  END IF;
END $$;

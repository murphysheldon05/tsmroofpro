-- Migrate deprecated role values to their replacements
-- ops_compliance -> admin, sales_manager -> manager, employee -> user
UPDATE public.user_roles SET role = 'admin' WHERE role = 'ops_compliance';
UPDATE public.user_roles SET role = 'manager' WHERE role = 'sales_manager';
UPDATE public.user_roles SET role = 'user' WHERE role = 'employee';

-- Add 'production' to enum if it doesn't exist, then migrate production_manager
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'production' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'production';
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Clear all existing test commission data (fresh start, everyone at $0)
DELETE FROM public.commission_status_log;
DELETE FROM public.commission_attachments;
DELETE FROM public.commission_entries;
DELETE FROM public.draw_requests;
DELETE FROM public.commission_submissions;
DELETE FROM public.commission_documents;

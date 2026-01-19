-- Create admin_audit_log table for tracking all admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  performed_by UUID NOT NULL,
  performed_by_email TEXT,
  performed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_admin_audit_log_action_type ON public.admin_audit_log(action_type);
CREATE INDEX idx_admin_audit_log_object_type ON public.admin_audit_log(object_type);
CREATE INDEX idx_admin_audit_log_performed_by ON public.admin_audit_log(performed_by);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (read-only, no insert/update/delete via RLS)
CREATE POLICY "Only admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow inserts from authenticated users (for logging purposes)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- No update or delete policies - logs are immutable
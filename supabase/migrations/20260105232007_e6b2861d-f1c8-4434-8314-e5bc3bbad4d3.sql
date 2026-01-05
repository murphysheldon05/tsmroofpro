-- Create table to store user permissions for sidebar sections
CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  section_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, section_key)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all permissions
CREATE POLICY "Admins can manage user permissions" 
ON public.user_permissions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions" 
ON public.user_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
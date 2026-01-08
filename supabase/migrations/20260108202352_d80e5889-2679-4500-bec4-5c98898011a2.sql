-- Create table to store access credentials documented by admins
CREATE TABLE public.new_hire_access_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  new_hire_id UUID NOT NULL REFERENCES public.new_hires(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL,
  email TEXT,
  password TEXT,
  invite_sent BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(new_hire_id, access_type)
);

-- Enable RLS
ALTER TABLE public.new_hire_access_credentials ENABLE ROW LEVEL SECURITY;

-- Only admins can manage access credentials
CREATE POLICY "Admins can manage access credentials"
ON public.new_hire_access_credentials
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view access credentials they submitted
CREATE POLICY "Managers can view credentials for hires they submitted"
ON public.new_hire_access_credentials
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.new_hires 
    WHERE new_hires.id = new_hire_access_credentials.new_hire_id 
    AND new_hires.submitted_by = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_new_hire_access_credentials_updated_at
BEFORE UPDATE ON public.new_hire_access_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
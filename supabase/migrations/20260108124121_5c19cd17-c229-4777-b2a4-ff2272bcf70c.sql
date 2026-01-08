-- Create new_hires table for onboarding tracking
CREATE TABLE public.new_hires (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  phone_number text,
  personal_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  required_access text[] DEFAULT '{}',
  notes text,
  submitted_by uuid NOT NULL,
  processed_by uuid,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.new_hires ENABLE ROW LEVEL SECURITY;

-- Managers and admins can view all new hires
CREATE POLICY "Managers and admins can view new hires" ON public.new_hires
  FOR SELECT USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Managers and admins can insert new hires
CREATE POLICY "Managers and admins can insert new hires" ON public.new_hires
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can update new hires (for processing)
CREATE POLICY "Admins can update new hires" ON public.new_hires
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete new hires
CREATE POLICY "Admins can delete new hires" ON public.new_hires
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_new_hires_updated_at
  BEFORE UPDATE ON public.new_hires
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
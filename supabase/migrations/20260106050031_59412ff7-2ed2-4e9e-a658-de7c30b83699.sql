-- Create email_templates table to store customizable email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  heading TEXT NOT NULL,
  intro_text TEXT NOT NULL,
  button_text TEXT NOT NULL DEFAULT 'Login to Portal',
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can view/edit email templates
CREATE POLICY "Admins can view email templates"
ON public.email_templates
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email templates"
ON public.email_templates
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default invite template
INSERT INTO public.email_templates (template_key, subject, heading, intro_text, button_text, footer_text)
VALUES (
  'user_invite',
  'Welcome to TSM Roofing Portal - Your Account Details',
  'Welcome to TSM Roofing',
  'Your account has been created for the TSM Roofing Employee Portal. Here are your login credentials:',
  'Login to Portal',
  'If you have any questions, please contact your manager or the admin team.'
);

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
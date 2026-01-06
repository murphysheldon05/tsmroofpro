-- Create notification_settings table for managing email recipients
CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(notification_type, recipient_email)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage notification settings
CREATE POLICY "Only admins can manage notification settings"
ON public.notification_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert current hardcoded recipients
INSERT INTO public.notification_settings (notification_type, recipient_email, recipient_name) VALUES
('request_submission', 'courtneymurphy@tsmroofs.com', 'Courtney Murphy'),
('request_submission', 'jordan.pollei@tsmroofs.com', 'Jordan Pollei'),
('request_submission', 'conrad.demecs@tsmroofs.com', 'Conrad Demecs');
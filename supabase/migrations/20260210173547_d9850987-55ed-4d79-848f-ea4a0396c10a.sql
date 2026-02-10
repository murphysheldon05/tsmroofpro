-- App settings table for admin toggles like leaderboard visibility
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT 'true'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert default leaderboard setting
INSERT INTO public.app_settings (setting_key, setting_value) VALUES ('show_sales_leaderboard', 'true'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
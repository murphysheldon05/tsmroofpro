-- Sales Leaderboard: OFF by default. Admins turn it on in settings when ready.
UPDATE public.app_settings
SET setting_value = 'false'::jsonb, updated_at = now()
WHERE setting_key = 'show_sales_leaderboard';

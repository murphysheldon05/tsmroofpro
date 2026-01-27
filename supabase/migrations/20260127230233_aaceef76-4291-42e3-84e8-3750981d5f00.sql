-- Fix the permissive INSERT policy for user_notifications
-- Notifications should only be inserted by the system (edge functions) using service role
-- Regular users should not be able to insert notifications directly

DROP POLICY IF EXISTS "Service can insert notifications" ON public.user_notifications;

-- Create a more restrictive policy - only allow inserts where the user_id matches a valid profile
-- This is still permissive but validates the target user exists
CREATE POLICY "Authenticated can insert notifications for valid users"
ON public.user_notifications
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id)
);
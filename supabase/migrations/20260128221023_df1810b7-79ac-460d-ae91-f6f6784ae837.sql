-- Create function to clean up pending_invites when user signs up
CREATE OR REPLACE FUNCTION public.cleanup_pending_invite_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a new profile is created, delete the corresponding pending invite
  DELETE FROM public.pending_invites WHERE email = NEW.email;
  RETURN NEW;
END;
$$;

-- Create trigger to run after profile insert
DROP TRIGGER IF EXISTS on_profile_created_cleanup_invite ON public.profiles;
CREATE TRIGGER on_profile_created_cleanup_invite
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_pending_invite_on_signup();
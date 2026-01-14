-- Add requested_department column to profiles for signup flow
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS requested_department text;

-- Add a comment for documentation
COMMENT ON COLUMN public.profiles.requested_department IS 'Department requested by user during signup';

-- Update the handle_new_user function to properly initialize new users as pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_approved)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), false);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$function$;
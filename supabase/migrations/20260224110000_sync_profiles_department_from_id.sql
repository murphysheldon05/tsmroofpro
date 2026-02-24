-- Sync profiles.department (string) from department_id when department_id changes
-- Ensures AuthContext userDepartment and app logic (Production, Accounting checks) work correctly
CREATE OR REPLACE FUNCTION public.sync_profiles_department_from_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.department_id IS NOT NULL THEN
    SELECT name INTO NEW.department
    FROM public.departments
    WHERE id = NEW.department_id;
  ELSE
    NEW.department := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_profiles_department ON public.profiles;
CREATE TRIGGER trigger_sync_profiles_department
  BEFORE INSERT OR UPDATE OF department_id
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profiles_department_from_id();

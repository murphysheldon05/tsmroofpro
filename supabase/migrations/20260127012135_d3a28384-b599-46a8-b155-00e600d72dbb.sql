-- Create helper function to check if user is an active approved employee
CREATE OR REPLACE FUNCTION public.is_active_employee(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id 
    AND employee_status = 'active'
  )
$$;

-- Drop existing policies on commission_submissions
DROP POLICY IF EXISTS "Reviewers can update submissions" ON public.commission_submissions;
DROP POLICY IF EXISTS "Reviewers can view all submissions" ON public.commission_submissions;
DROP POLICY IF EXISTS "Submitters can update own submissions needing revision" ON public.commission_submissions;
DROP POLICY IF EXISTS "Users can insert their own submissions" ON public.commission_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.commission_submissions;

-- Recreate policies with active employee check

-- Only active employees who are reviewers/admins can update submissions
CREATE POLICY "Reviewers can update submissions"
ON public.commission_submissions
FOR UPDATE
TO authenticated
USING (
  is_active_employee(auth.uid()) 
  AND (is_commission_reviewer(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Only active employees who are reviewers/admins can view all submissions
CREATE POLICY "Reviewers can view all submissions"
ON public.commission_submissions
FOR SELECT
TO authenticated
USING (
  is_active_employee(auth.uid())
  AND (is_commission_reviewer(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Only active employees can update their own submissions needing revision
CREATE POLICY "Submitters can update own submissions needing revision"
ON public.commission_submissions
FOR UPDATE
TO authenticated
USING (
  is_active_employee(auth.uid())
  AND submitted_by = auth.uid() 
  AND status = 'revision_required'
)
WITH CHECK (
  is_active_employee(auth.uid())
  AND submitted_by = auth.uid() 
  AND status = ANY (ARRAY['revision_required', 'pending_review'])
);

-- Only active employees can insert their own submissions
CREATE POLICY "Users can insert their own submissions"
ON public.commission_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  is_active_employee(auth.uid())
  AND auth.uid() = submitted_by
);

-- Only active employees can view their own submissions
CREATE POLICY "Users can view their own submissions"
ON public.commission_submissions
FOR SELECT
TO authenticated
USING (
  is_active_employee(auth.uid())
  AND submitted_by = auth.uid()
);
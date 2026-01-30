-- Drop existing policies that need refinement
DROP POLICY IF EXISTS "Admins and ops_compliance can manage all acknowledgments" ON public.sop_acknowledgments;
DROP POLICY IF EXISTS "Admins and ops_compliance can manage violations" ON public.compliance_violations;
DROP POLICY IF EXISTS "Admins and ops_compliance can manage holds" ON public.compliance_holds;
DROP POLICY IF EXISTS "Admins and ops_compliance can manage escalations" ON public.compliance_escalations;
DROP POLICY IF EXISTS "Admins and ops_compliance can manage audit log" ON public.compliance_audit_log;

-- sop_acknowledgments: ops_compliance can read all, admin has full CRUD
CREATE POLICY "Admins have full control on acknowledgments"
ON public.sop_acknowledgments FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Ops compliance can view all acknowledgments"
ON public.sop_acknowledgments FOR SELECT
USING (has_role(auth.uid(), 'ops_compliance'));

-- compliance_violations: ops_compliance has full CRUD EXCEPT delete
CREATE POLICY "Admins have full control on violations"
ON public.compliance_violations FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Ops compliance can view all violations"
ON public.compliance_violations FOR SELECT
USING (has_role(auth.uid(), 'ops_compliance'));

CREATE POLICY "Ops compliance can create violations"
ON public.compliance_violations FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ops_compliance'));

CREATE POLICY "Ops compliance can update violations"
ON public.compliance_violations FOR UPDATE
USING (has_role(auth.uid(), 'ops_compliance'));

-- compliance_holds: ops_compliance has full CRUD
CREATE POLICY "Admins have full control on holds"
ON public.compliance_holds FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Ops compliance can view all holds"
ON public.compliance_holds FOR SELECT
USING (has_role(auth.uid(), 'ops_compliance'));

CREATE POLICY "Ops compliance can create holds"
ON public.compliance_holds FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ops_compliance'));

CREATE POLICY "Ops compliance can update holds"
ON public.compliance_holds FOR UPDATE
USING (has_role(auth.uid(), 'ops_compliance'));

CREATE POLICY "Ops compliance can delete holds"
ON public.compliance_holds FOR DELETE
USING (has_role(auth.uid(), 'ops_compliance'));

-- compliance_escalations: ops_compliance can create/read only, admin decides
CREATE POLICY "Admins have full control on escalations"
ON public.compliance_escalations FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Ops compliance can view all escalations"
ON public.compliance_escalations FOR SELECT
USING (has_role(auth.uid(), 'ops_compliance'));

CREATE POLICY "Ops compliance can create escalations"
ON public.compliance_escalations FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ops_compliance'));

-- compliance_audit_log: ops_compliance can read all and create, no delete
CREATE POLICY "Admins have full control on audit log"
ON public.compliance_audit_log FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Ops compliance can view audit log"
ON public.compliance_audit_log FOR SELECT
USING (has_role(auth.uid(), 'ops_compliance'));

CREATE POLICY "Ops compliance can create audit entries"
ON public.compliance_audit_log FOR INSERT
WITH CHECK (has_role(auth.uid(), 'ops_compliance'));

-- Give ops_compliance read access to commission_submissions for compliance review
CREATE POLICY "Ops compliance can view all commissions for compliance"
ON public.commission_submissions FOR SELECT
USING (has_role(auth.uid(), 'ops_compliance'));

-- Give ops_compliance read access to commission_documents
CREATE POLICY "Ops compliance can view all commission documents"
ON public.commission_documents FOR SELECT
USING (has_role(auth.uid(), 'ops_compliance'));

-- Helper function to check ops_compliance role
CREATE OR REPLACE FUNCTION public.is_ops_compliance(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'ops_compliance'
  )
$$;
-- RPC: Create/link a commission_submissions workflow record from a submitted commission_document.
-- This enables a single source of truth for workflow while preserving the document UI.

CREATE OR REPLACE FUNCTION public.create_submission_from_document(document_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  doc record;
  submission_id uuid;
  is_mgr_submission boolean := false;
  stage text := 'pending_manager';
  mgr_id uuid;
  pct numeric;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO doc
  FROM public.commission_documents
  WHERE id = document_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission document not found';
  END IF;

  -- If already linked, return existing workflow id
  IF doc.workflow_submission_id IS NOT NULL THEN
    RETURN doc.workflow_submission_id;
  END IF;

  -- Allow creator (or admin) to create the workflow link
  IF doc.created_by <> uid AND NOT public.has_role(uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Determine if this is a manager submission (routes to pending_admin)
  IF public.has_role(uid, 'admin'::app_role) OR public.has_role(uid, 'sales_manager'::app_role) THEN
    is_mgr_submission := true;
    stage := 'pending_admin';
  END IF;

  -- Governance rule: regular reps must have a manager assigned
  IF NOT is_mgr_submission THEN
    SELECT manager_id INTO mgr_id
    FROM public.profiles
    WHERE id = uid;

    IF mgr_id IS NULL THEN
      SELECT manager_id INTO mgr_id
      FROM public.team_assignments
      WHERE employee_id = uid
      LIMIT 1;
    END IF;

    IF mgr_id IS NULL THEN
      RAISE EXCEPTION 'MANAGER_REQUIRED';
    END IF;
  END IF;

  -- Compute a commission percentage so net_commission_owed matches rep_commission.
  IF COALESCE(doc.gross_contract_total, 0) > 0 THEN
    pct := ((COALESCE(doc.rep_commission, 0) + COALESCE(doc.advance_total, 0)) / doc.gross_contract_total) * 100;
  ELSE
    pct := 0;
  END IF;

  INSERT INTO public.commission_submissions (
    submitted_by,
    submission_type,
    status,
    approval_stage,
    job_name,
    job_address,
    acculynx_job_id,
    job_type,
    roof_type,
    contract_date,
    install_completion_date,
    sales_rep_id,
    sales_rep_name,
    rep_role,
    commission_tier,
    custom_commission_percentage,
    subcontractor_name,
    is_flat_fee,
    flat_fee_amount,
    contract_amount,
    supplements_approved,
    commission_percentage,
    advances_paid,
    commission_requested,
    is_manager_submission,
    source_document_type,
    source_document_id
  )
  VALUES (
    uid,
    'employee',
    'pending_review',
    stage,
    doc.job_name_id,
    doc.job_name_id,
    NULL,
    'retail',
    'other',
    doc.job_date,
    NULL,
    doc.sales_rep_id,
    doc.sales_rep,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    NULL,
    COALESCE(doc.gross_contract_total, 0),
    0,
    pct,
    COALESCE(doc.advance_total, 0),
    COALESCE(doc.rep_commission, 0),
    is_mgr_submission,
    'commission_document',
    doc.id
  )
  RETURNING id INTO submission_id;

  -- Link back to the document (doc is already submitted; this only records linkage)
  UPDATE public.commission_documents
  SET workflow_submission_id = submission_id
  WHERE id = doc.id;

  -- Initial status log entry
  INSERT INTO public.commission_status_log (
    commission_id,
    previous_status,
    new_status,
    changed_by,
    notes
  )
  VALUES (
    submission_id,
    NULL,
    'pending_review',
    uid,
    'Commission submitted (from commission document)'
  );

  RETURN submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_submission_from_document(uuid) TO authenticated;


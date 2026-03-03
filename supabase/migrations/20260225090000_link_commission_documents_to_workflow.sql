-- Link commission_documents to commission_submissions as single workflow source of truth.
-- - commission_submissions: workflow state, queues, reporting
-- - commission_documents: draft + printable detail, synced from workflow once submitted

-- 1) Add linkage columns (idempotent)
ALTER TABLE public.commission_documents
ADD COLUMN IF NOT EXISTS workflow_submission_id uuid
  REFERENCES public.commission_submissions(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commission_documents_workflow_submission_id
  ON public.commission_documents(workflow_submission_id);

ALTER TABLE public.commission_submissions
ADD COLUMN IF NOT EXISTS source_document_type text,
ADD COLUMN IF NOT EXISTS source_document_id uuid;

CREATE INDEX IF NOT EXISTS idx_commission_submissions_source_document
  ON public.commission_submissions(source_document_type, source_document_id);

COMMENT ON COLUMN public.commission_documents.workflow_submission_id IS 'Linked commission_submissions workflow record created on submit.';
COMMENT ON COLUMN public.commission_submissions.source_document_type IS 'Source system identifier (e.g., commission_document).';
COMMENT ON COLUMN public.commission_submissions.source_document_id IS 'Source record id (e.g., commission_documents.id).';

-- 2) Align approval_stage values to app workflow (pending_manager -> pending_accounting -> completed) + pending_admin.
--    Older values: manager_approved/accounting_approved are migrated forward.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.commission_submissions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%approval_stage%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.commission_submissions DROP CONSTRAINT %I', cname);
  END IF;
END $$;

UPDATE public.commission_submissions
SET approval_stage = 'pending_manager'
WHERE approval_stage IS NULL OR approval_stage = 'pending';

UPDATE public.commission_submissions
SET approval_stage = 'pending_accounting'
WHERE approval_stage = 'manager_approved';

UPDATE public.commission_submissions
SET approval_stage = 'completed'
WHERE approval_stage = 'accounting_approved' OR approval_stage = 'approved';

ALTER TABLE public.commission_submissions
ALTER COLUMN approval_stage SET DEFAULT 'pending_manager';

ALTER TABLE public.commission_submissions
ADD CONSTRAINT commission_submissions_approval_stage_check
CHECK (
  approval_stage IS NULL OR approval_stage IN ('pending_manager', 'pending_accounting', 'pending_admin', 'completed')
);

-- 3) Backfill: create workflow records for existing non-draft commission_documents without linkage.
WITH to_insert AS (
  SELECT
    cd.id AS document_id,
    cd.created_by AS submitter_id,
    cd.job_name_id,
    cd.job_date,
    cd.sales_rep,
    cd.sales_rep_id,
    cd.gross_contract_total,
    cd.advance_total,
    cd.rep_commission,
    cd.status AS doc_status
  FROM public.commission_documents cd
  WHERE cd.status <> 'draft'
    AND cd.workflow_submission_id IS NULL
),
ins AS (
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
    source_document_type,
    source_document_id
  )
  SELECT
    t.submitter_id,
    'employee',
    CASE
      WHEN t.doc_status = 'paid' THEN 'paid'
      WHEN t.doc_status = 'accounting_approved' THEN 'approved'
      WHEN t.doc_status = 'rejected' THEN 'denied'
      WHEN t.doc_status = 'revision_required' THEN 'rejected'
      ELSE 'pending_review'
    END AS status,
    CASE
      WHEN t.doc_status IN ('paid', 'accounting_approved') THEN 'completed'
      WHEN t.doc_status = 'manager_approved' THEN 'pending_accounting'
      ELSE 'pending_manager'
    END AS approval_stage,
    t.job_name_id,
    t.job_name_id,
    NULL,
    'retail',
    'other',
    t.job_date,
    NULL,
    t.sales_rep_id,
    t.sales_rep,
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    NULL,
    COALESCE(t.gross_contract_total, 0),
    0,
    CASE
      WHEN COALESCE(t.gross_contract_total, 0) > 0
        THEN ((COALESCE(t.rep_commission, 0) + COALESCE(t.advance_total, 0)) / COALESCE(t.gross_contract_total, 1)) * 100
      ELSE 0
    END AS commission_percentage,
    COALESCE(t.advance_total, 0),
    COALESCE(t.rep_commission, 0),
    'commission_document',
    t.document_id
  FROM to_insert t
  RETURNING id, source_document_id
)
UPDATE public.commission_documents cd
SET workflow_submission_id = ins.id
FROM ins
WHERE cd.id = ins.source_document_id;

-- 4) Keep commission_documents workflow fields synced from the linked workflow record.
CREATE OR REPLACE FUNCTION public.sync_commission_document_from_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_doc_status text;
BEGIN
  IF NEW.source_document_type IS DISTINCT FROM 'commission_document' OR NEW.source_document_id IS NULL THEN
    RETURN NEW;
  END IF;

  new_doc_status :=
    CASE
      WHEN NEW.status = 'pending_review' AND (NEW.approval_stage = 'pending_manager' OR NEW.approval_stage = 'pending_admin' OR NEW.approval_stage IS NULL)
        THEN 'submitted'
      WHEN NEW.status = 'pending_review' AND NEW.approval_stage = 'pending_accounting'
        THEN 'manager_approved'
      WHEN NEW.status = 'approved' AND (NEW.approval_stage = 'completed' OR NEW.approval_stage IS NULL)
        THEN 'accounting_approved'
      WHEN NEW.status = 'paid'
        THEN 'paid'
      WHEN NEW.status = 'rejected'
        THEN 'revision_required'
      WHEN NEW.status = 'denied'
        THEN 'rejected'
      ELSE NULL
    END;

  UPDATE public.commission_documents
  SET
    workflow_submission_id = NEW.id,
    status = COALESCE(new_doc_status, status),
    manager_approved_at = COALESCE(NEW.manager_approved_at, manager_approved_at),
    manager_approved_by = COALESCE(NEW.manager_approved_by, manager_approved_by),
    accounting_approved_at = COALESCE(NEW.approved_at, accounting_approved_at),
    accounting_approved_by = COALESCE(NEW.approved_by, accounting_approved_by),
    paid_at = COALESCE(NEW.paid_at, paid_at),
    paid_by = COALESCE(NEW.paid_by, paid_by),
    scheduled_pay_date = COALESCE(NEW.scheduled_pay_date, scheduled_pay_date),
    revision_reason = CASE
      WHEN NEW.status IN ('rejected', 'denied') THEN COALESCE(NEW.rejection_reason, revision_reason)
      ELSE revision_reason
    END
  WHERE id = NEW.source_document_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_commission_document_from_submission_trigger ON public.commission_submissions;
CREATE TRIGGER sync_commission_document_from_submission_trigger
AFTER UPDATE ON public.commission_submissions
FOR EACH ROW
EXECUTE FUNCTION public.sync_commission_document_from_submission();


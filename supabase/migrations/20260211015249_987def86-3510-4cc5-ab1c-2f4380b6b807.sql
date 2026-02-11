
-- Drop the restrictive update policies for commission_documents
DROP POLICY IF EXISTS "Users can update own drafts" ON public.commission_documents;
DROP POLICY IF EXISTS "Users can update own drafts and revisions" ON public.commission_documents;

-- Create a single unified policy that allows creators to update their own documents
-- in draft, submitted, revision_required, or rejected status (for resubmission)
CREATE POLICY "Users can update own editable documents"
ON public.commission_documents
FOR UPDATE
USING (
  auth.uid() = created_by 
  AND status IN ('draft', 'submitted', 'revision_required', 'rejected')
);

-- Store individual additional negative expenses instead of bundling them into neg_exp_4.
-- This allows admins to see each expense line when reviewing commissions.

ALTER TABLE public.commission_documents
ADD COLUMN IF NOT EXISTS additional_neg_expenses jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.commission_documents.additional_neg_expenses IS
  'Array of {amount, label?} objects for additional negative expenses beyond the 4 fixed slots. Stored individually for admin review transparency.';

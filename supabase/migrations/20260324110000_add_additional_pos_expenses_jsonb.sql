-- Store individual additional positive expenses (returns, credits)
-- so admins see each line item during review, matching the negative expense pattern.

ALTER TABLE public.commission_documents
ADD COLUMN IF NOT EXISTS additional_pos_expenses jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.commission_documents.additional_pos_expenses IS
  'Array of {amount, label?} objects for additional positive expenses beyond the 4 fixed slots.';

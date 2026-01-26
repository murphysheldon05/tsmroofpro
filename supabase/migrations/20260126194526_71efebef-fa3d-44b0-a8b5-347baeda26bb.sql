-- ============================================================================
-- GOVERNED APPROVAL SYSTEM NORMALIZATION
-- Creates unified pending_approvals table and normalizes profile status
-- ============================================================================

-- STEP 1: Create unified pending_approvals table for ALL reviewable entities
CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('user', 'request', 'warranty', 'commission', 'sop')),
  entity_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  assigned_to_role text CHECK (assigned_to_role IN ('admin', 'manager', 'accounting', 'production')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicate pending entries
  UNIQUE(entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pending_approvals
CREATE POLICY "Admins can manage all pending approvals"
ON public.pending_approvals
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view and update pending approvals"
ON public.pending_approvals
FOR ALL
USING (has_role(auth.uid(), 'manager'));

CREATE POLICY "Users can view their own pending items"
ON public.pending_approvals
FOR SELECT
USING (submitted_by = auth.uid());

-- STEP 2: Sync existing pending users into pending_approvals table
INSERT INTO public.pending_approvals (entity_type, entity_id, status, submitted_by, submitted_at, assigned_to_role, notes)
SELECT 
  'user' as entity_type,
  p.id as entity_id,
  'pending' as status,
  p.id as submitted_by,
  p.created_at as submitted_at,
  'admin' as assigned_to_role,
  'Auto-created from existing pending profile' as notes
FROM public.profiles p
WHERE p.is_approved = false 
  AND (p.employee_status = 'pending' OR p.employee_status IS NULL)
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- STEP 3: Create trigger to auto-create pending_approval on new profile creation
CREATE OR REPLACE FUNCTION public.create_pending_approval_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create pending_approval if user is not pre-approved
  IF NEW.is_approved = false OR NEW.employee_status = 'pending' THEN
    INSERT INTO public.pending_approvals (entity_type, entity_id, status, submitted_by, assigned_to_role)
    VALUES ('user', NEW.id, 'pending', NEW.id, 'admin')
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS trigger_create_pending_approval_for_user ON public.profiles;
CREATE TRIGGER trigger_create_pending_approval_for_user
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_pending_approval_for_new_user();

-- STEP 4: Create trigger to update updated_at on pending_approvals
CREATE TRIGGER update_pending_approvals_updated_at
BEFORE UPDATE ON public.pending_approvals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- STEP 5: Create index for common queries
CREATE INDEX IF NOT EXISTS idx_pending_approvals_status ON public.pending_approvals(status);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_entity ON public.pending_approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_assigned_role ON public.pending_approvals(assigned_to_role) WHERE status = 'pending';
-- Add workflow tracking columns to commission_documents
ALTER TABLE public.commission_documents
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS accounting_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS accounting_approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS revision_reason TEXT,
ADD COLUMN IF NOT EXISTS revision_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS submitter_email TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_documents_manager_id ON public.commission_documents(manager_id);
CREATE INDEX IF NOT EXISTS idx_commission_documents_status ON public.commission_documents(status);
CREATE INDEX IF NOT EXISTS idx_commission_documents_created_by ON public.commission_documents(created_by);

-- Create user_notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.user_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.user_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications for any user (via service role)
CREATE POLICY "Service can insert notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (true);

-- Create index for fast user notification lookup
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON public.user_notifications(user_id, is_read);

-- Update RLS policies for commission_documents to support manager-based access
-- First drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own commission documents" ON public.commission_documents;
DROP POLICY IF EXISTS "Users can insert own commission documents" ON public.commission_documents;
DROP POLICY IF EXISTS "Users can update own commission documents" ON public.commission_documents;
DROP POLICY IF EXISTS "Managers can view assigned rep documents" ON public.commission_documents;
DROP POLICY IF EXISTS "Reviewers can view all documents" ON public.commission_documents;
DROP POLICY IF EXISTS "Reviewers can update documents" ON public.commission_documents;

-- Users can view their own documents
CREATE POLICY "Users can view own commission documents"
ON public.commission_documents
FOR SELECT
USING (auth.uid() = created_by);

-- Users can insert their own documents
CREATE POLICY "Users can insert own commission documents"
ON public.commission_documents
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update their own draft or revision_required documents
CREATE POLICY "Users can update own drafts and revisions"
ON public.commission_documents
FOR UPDATE
USING (auth.uid() = created_by AND status IN ('draft', 'revision_required'));

-- Managers can view documents where they are assigned as manager
CREATE POLICY "Managers can view assigned rep documents"
ON public.commission_documents
FOR SELECT
USING (auth.uid() = manager_id);

-- Managers can update documents they're assigned to review
CREATE POLICY "Managers can update assigned documents"
ON public.commission_documents
FOR UPDATE
USING (auth.uid() = manager_id AND status IN ('submitted', 'revision_required'));

-- Admins and commission reviewers can view all
CREATE POLICY "Reviewers can view all documents"
ON public.commission_documents
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR is_commission_reviewer(auth.uid()));

-- Admins and commission reviewers can update all
CREATE POLICY "Reviewers can update all documents"
ON public.commission_documents
FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR is_commission_reviewer(auth.uid()));
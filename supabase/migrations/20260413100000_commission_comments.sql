-- Commission Comments / Communication Thread
-- Enables back-and-forth conversation on commission forms between reps and compliance

CREATE TABLE IF NOT EXISTS commission_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES commission_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  comment_text TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'reply'
    CHECK (comment_type IN ('rejection_note', 'reply', 'revision_note')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_comments_commission ON commission_comments(commission_id);
CREATE INDEX idx_commission_comments_user ON commission_comments(user_id);

ALTER TABLE commission_comments ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_all_commission_comments"
  ON commission_comments
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Accounting: read-only
CREATE POLICY "accounting_select_commission_comments"
  ON commission_comments
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'accounting')
  );

-- Commission owner: can read all comments on their commissions
CREATE POLICY "owner_select_commission_comments"
  ON commission_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM commission_documents
      WHERE commission_documents.id = commission_comments.commission_id
        AND commission_documents.created_by = auth.uid()
    )
  );

-- Commission owner: can insert replies on their commissions
CREATE POLICY "owner_insert_commission_comments"
  ON commission_comments
  FOR INSERT
  WITH CHECK (
    commission_comments.user_id = auth.uid()
    AND commission_comments.comment_type = 'reply'
    AND EXISTS (
      SELECT 1 FROM commission_documents
      WHERE commission_documents.id = commission_comments.commission_id
        AND commission_documents.created_by = auth.uid()
    )
  );

-- Commission owner: can mark comments as read on their commissions
CREATE POLICY "owner_update_read_commission_comments"
  ON commission_comments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM commission_documents
      WHERE commission_documents.id = commission_comments.commission_id
        AND commission_documents.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM commission_documents
      WHERE commission_documents.id = commission_comments.commission_id
        AND commission_documents.created_by = auth.uid()
    )
  );

-- Managers: can read all comments
CREATE POLICY "manager_select_commission_comments"
  ON commission_comments
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
  );

-- Managers: can insert comments
CREATE POLICY "manager_insert_commission_comments"
  ON commission_comments
  FOR INSERT
  WITH CHECK (
    commission_comments.user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'manager')
  );

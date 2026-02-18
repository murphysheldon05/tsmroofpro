
-- Warranty watchers table
CREATE TABLE public.warranty_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id UUID NOT NULL REFERENCES public.warranty_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(warranty_id, user_id)
);

ALTER TABLE public.warranty_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view watchers" ON public.warranty_watchers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage own watcher status" ON public.warranty_watchers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own watcher status" ON public.warranty_watchers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all watchers" ON public.warranty_watchers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add mentioned_users array to warranty_notes for tracking @mentions
ALTER TABLE public.warranty_notes ADD COLUMN mentioned_users UUID[] DEFAULT '{}';

-- Add mention_responded flag for 48h overdue tracking
ALTER TABLE public.warranty_notes ADD COLUMN mention_responded BOOLEAN DEFAULT false;

-- Enable realtime for warranty_notes so watchers get live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.warranty_notes;

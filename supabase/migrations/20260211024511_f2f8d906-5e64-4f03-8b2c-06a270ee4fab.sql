
-- Tutorial completions table (replaces localStorage tracking)
CREATE TABLE public.user_tutorial_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed BOOLEAN NOT NULL DEFAULT false,
  last_step_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_key)
);

-- Enable RLS
ALTER TABLE public.user_tutorial_completions ENABLE ROW LEVEL SECURITY;

-- Users can read their own records
CREATE POLICY "Users can view own tutorial completions"
  ON public.user_tutorial_completions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own records
CREATE POLICY "Users can insert own tutorial completions"
  ON public.user_tutorial_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own records
CREATE POLICY "Users can update own tutorial completions"
  ON public.user_tutorial_completions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all (for admin reporting)
CREATE POLICY "Admins can view all tutorial completions"
  ON public.user_tutorial_completions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

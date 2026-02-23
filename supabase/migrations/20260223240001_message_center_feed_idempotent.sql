-- Message Center / Company Feed (idempotent — safe to re-run)
-- Creates types/tables only if missing; drops and recreates policies.

-- 1. Create enums only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feed_post_type') THEN
    CREATE TYPE public.feed_post_type AS ENUM ('win', 'announcement', 'update');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feed_reaction_emoji') THEN
    CREATE TYPE public.feed_reaction_emoji AS ENUM ('thumbs_up', 'fire');
  END IF;
END $$;

-- 2. Tables (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_type public.feed_post_type not null default 'win',
  content text not null,
  image_url text,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.feed_reactions (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji public.feed_reaction_emoji not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.message_center_last_visit (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_visited_at timestamptz not null default now()
);

-- 3. Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts(created_at desc);
CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON public.feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON public.feed_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON public.feed_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_created ON public.feed_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_post ON public.feed_reactions(post_id);

-- 4. RLS
ALTER TABLE public.feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_center_last_visit ENABLE ROW LEVEL SECURITY;

-- 5. Drop policies if they exist (so we can re-create)
DROP POLICY IF EXISTS "feed_posts_select" ON public.feed_posts;
DROP POLICY IF EXISTS "feed_posts_insert" ON public.feed_posts;
DROP POLICY IF EXISTS "feed_posts_update" ON public.feed_posts;
DROP POLICY IF EXISTS "feed_posts_delete" ON public.feed_posts;
DROP POLICY IF EXISTS "feed_comments_select" ON public.feed_comments;
DROP POLICY IF EXISTS "feed_comments_insert" ON public.feed_comments;
DROP POLICY IF EXISTS "feed_comments_delete" ON public.feed_comments;
DROP POLICY IF EXISTS "feed_reactions_select" ON public.feed_reactions;
DROP POLICY IF EXISTS "feed_reactions_insert" ON public.feed_reactions;
DROP POLICY IF EXISTS "feed_reactions_delete" ON public.feed_reactions;
DROP POLICY IF EXISTS "message_center_last_visit_select" ON public.message_center_last_visit;
DROP POLICY IF EXISTS "message_center_last_visit_upsert" ON public.message_center_last_visit;

-- 6. Create policies
CREATE POLICY "feed_posts_select" ON public.feed_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "feed_posts_insert" ON public.feed_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "feed_posts_update" ON public.feed_posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));
CREATE POLICY "feed_posts_delete" ON public.feed_posts FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "feed_comments_select" ON public.feed_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "feed_comments_insert" ON public.feed_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "feed_comments_delete" ON public.feed_comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "feed_reactions_select" ON public.feed_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "feed_reactions_insert" ON public.feed_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feed_reactions_delete" ON public.feed_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "message_center_last_visit_select" ON public.message_center_last_visit FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "message_center_last_visit_upsert" ON public.message_center_last_visit FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Comments
COMMENT ON TABLE public.feed_posts IS 'Message Center / Company Feed posts (win, announcement, update)';
COMMENT ON TABLE public.feed_comments IS 'Comments on feed posts; supports @mentions';
COMMENT ON TABLE public.feed_reactions IS 'Reactions (thumbs up / fire) on feed posts';
COMMENT ON TABLE public.message_center_last_visit IS 'When user last visited Message Center; used to show badge for new announcements/updates';

-- 8. Storage bucket (ignore if already exists)
INSERT INTO storage.buckets (id, name, public) VALUES ('feed-images', 'feed-images', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Storage policies (drop then create so re-run works)
DROP POLICY IF EXISTS "Public read feed images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload feed images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own feed images" ON storage.objects;

CREATE POLICY "Public read feed images" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'feed-images');

CREATE POLICY "Users can upload feed images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'feed-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own feed images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'feed-images' AND (storage.foldername(name))[1] = auth.uid()::text);

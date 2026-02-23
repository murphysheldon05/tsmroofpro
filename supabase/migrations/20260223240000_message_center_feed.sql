-- Message Center / Company Feed
-- Posts (Win / Announcement / Update), comments, reactions, and badge read tracking

-- Post types: win (any user), announcement (admin/manager), update (admin/manager)
create type public.feed_post_type as enum ('win', 'announcement', 'update');

-- Reactions: thumbs up or fire per user per post
create type public.feed_reaction_emoji as enum ('thumbs_up', 'fire');

-- Feed posts
create table public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_type public.feed_post_type not null default 'win',
  content text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index idx_feed_posts_created_at on public.feed_posts(created_at desc);
create index idx_feed_posts_author on public.feed_posts(author_id);
create index idx_feed_posts_type on public.feed_posts(post_type);

-- Feed comments
create table public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_feed_comments_post on public.feed_comments(post_id);
create index idx_feed_comments_created on public.feed_comments(created_at);

-- Feed reactions (one reaction per user per post: thumbs_up or fire)
create table public.feed_reactions (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji public.feed_reaction_emoji not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index idx_feed_reactions_post on public.feed_reactions(post_id);

-- Track when user last visited Message Center (for clearing announcement/update badge)
create table public.message_center_last_visit (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_visited_at timestamptz not null default now()
);

-- RLS
alter table public.feed_posts enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_reactions enable row level security;
alter table public.message_center_last_visit enable row level security;

-- feed_posts: all authenticated read; insert own; update/delete own or admin
create policy "feed_posts_select" on public.feed_posts for select to authenticated using (true);
create policy "feed_posts_insert" on public.feed_posts for insert to authenticated with check (auth.uid() = author_id);
create policy "feed_posts_update" on public.feed_posts for update to authenticated
  using (auth.uid() = author_id or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));
create policy "feed_posts_delete" on public.feed_posts for delete to authenticated
  using (auth.uid() = author_id or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- feed_comments: all authenticated read; insert own; delete own or admin
create policy "feed_comments_select" on public.feed_comments for select to authenticated using (true);
create policy "feed_comments_insert" on public.feed_comments for insert to authenticated with check (auth.uid() = author_id);
create policy "feed_comments_delete" on public.feed_comments for delete to authenticated
  using (auth.uid() = author_id or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

-- feed_reactions: all read; insert/delete own
create policy "feed_reactions_select" on public.feed_reactions for select to authenticated using (true);
create policy "feed_reactions_insert" on public.feed_reactions for insert to authenticated with check (auth.uid() = user_id);
create policy "feed_reactions_delete" on public.feed_reactions for delete to authenticated using (auth.uid() = user_id);

-- message_center_last_visit: own row only
create policy "message_center_last_visit_select" on public.message_center_last_visit for select to authenticated using (auth.uid() = user_id);
create policy "message_center_last_visit_upsert" on public.message_center_last_visit for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket for feed images (create via dashboard or ensure bucket exists; policy below)
-- insert policy: authenticated users can upload to feed-images/{user_id}/*
-- select: public read for viewing images

comment on table public.feed_posts is 'Message Center / Company Feed posts (win, announcement, update)';
comment on table public.feed_comments is 'Comments on feed posts; supports @mentions';
comment on table public.feed_reactions is 'Reactions (thumbs up / fire) on feed posts';
comment on table public.message_center_last_visit is 'When user last visited Message Center; used to show badge for new announcements/updates';

-- Storage bucket for feed post images
insert into storage.buckets (id, name, public) values ('feed-images', 'feed-images', true);

-- Anyone can view feed images (public bucket)
create policy "Public read feed images"
on storage.objects for select to public
using (bucket_id = 'feed-images');

-- Authenticated users can upload to their own folder: feed-images/{user_id}/*
create policy "Users can upload feed images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'feed-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own feed images
create policy "Users can delete own feed images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'feed-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

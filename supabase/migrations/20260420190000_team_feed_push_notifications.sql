create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time timestamptz,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users can view own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
on public.push_subscriptions
for delete
to authenticated
using (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.user_notifications;
exception
  when duplicate_object then null;
end $$;

-- Step 2: profiles and backlog items, with Row Level Security.
-- Run once in Supabase > SQL Editor.

-- ---------------------------------------------------------------------------
-- profiles: one row per user, created on first access (username choice)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Logged-in users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- backlog_items: games in each user's backlog (data comes from RAWG)
-- ---------------------------------------------------------------------------
create table public.backlog_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rawg_id integer not null,
  title text not null,
  cover_url text,
  platforms text[] not null default '{}',
  genres text[] not null default '{}',
  release_year smallint,
  avg_playtime_hours integer,
  status text not null default 'backlog'
    check (status in ('backlog', 'playing', 'finished', 'dropped')),
  priority smallint not null default 2
    check (priority between 1 and 3),
  rating smallint
    check (rating between 1 and 10),
  notes text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, rawg_id)
);

create index backlog_items_user_status_idx
  on public.backlog_items (user_id, status);

alter table public.backlog_items enable row level security;

create policy "Logged-in users can read backlogs"
  on public.backlog_items for select
  to authenticated
  using (true);

create policy "Users can add to their own backlog"
  on public.backlog_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own backlog"
  on public.backlog_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete from their own backlog"
  on public.backlog_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Keep updated_at current on every update.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger backlog_items_set_updated_at
  before update on public.backlog_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- API access: only logged-in users. RLS above decides which rows.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.backlog_items to authenticated;

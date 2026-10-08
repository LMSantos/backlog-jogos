-- Step 9: snapshot of each user's Steam achievement progress per game.
-- Run once in Supabase > SQL Editor.
--
-- Read by everyone logged in (friends compare progress in step 10), written
-- ONLY by the server with the secret key, right after reading Steam.

create table public.steam_achievement_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  steam_app_id integer not null check (steam_app_id > 0),
  unlocked integer not null check (unlocked >= 0),
  -- 0 = the game has no achievements on Steam.
  total integer not null check (total >= 0 and unlocked <= total),
  synced_at timestamptz not null default now(),
  primary key (user_id, steam_app_id)
);

alter table public.steam_achievement_progress enable row level security;

-- Policy name without quotes: the Supabase SQL editor auto-closes typed
-- double quotes, which broke the first run of this migration.
create policy achievement_progress_readable_by_logged_in
  on public.steam_achievement_progress for select
  to authenticated
  using (true);

-- Supabase grants every privilege on new public tables to anon and
-- authenticated by default. RLS (no write policies) already blocks writes;
-- revoking them too keeps "only the server writes" true at two levels.
revoke insert, update, delete, truncate
  on public.steam_achievement_progress from anon, authenticated;
revoke select on public.steam_achievement_progress from anon;
grant select on public.steam_achievement_progress to authenticated;
grant select, insert, update, delete
  on public.steam_achievement_progress to service_role;

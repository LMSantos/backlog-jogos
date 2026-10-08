-- Step 8: games imported from the Steam library.
-- Run once in Supabase > SQL Editor.

alter table public.backlog_items
  -- Steam app id (from the Steam library). Needed later for achievements.
  add column steam_app_id integer check (steam_app_id > 0),
  -- Real playtime on Steam, in minutes, as of the last import.
  add column steam_playtime_minutes integer check (steam_playtime_minutes >= 0);

create index backlog_items_user_steam_app_idx
  on public.backlog_items (user_id, steam_app_id);

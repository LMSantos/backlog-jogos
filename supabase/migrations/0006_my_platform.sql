-- Step 13: where *I* play each game (not where it exists: that's
-- `platforms`, from RAWG, which doesn't know the Switch 2).
-- Run once in Supabase > SQL Editor.

alter table public.backlog_items
  add column my_platform text check (my_platform in (
    'pc', 'steam-deck', 'ps5', 'ps4', 'xbox-series', 'xbox-one',
    'switch', 'switch-2', 'mobile', 'other'
  ));

-- Games imported from Steam are played on PC.
update public.backlog_items
  set my_platform = 'pc'
  where steam_app_id is not null and my_platform is null;

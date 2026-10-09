-- Step 15: my own estimate of hours to finish a game. When set, it is used
-- everywhere instead of avg_playtime_hours (RAWG), which stays as reference.
-- Run once in Supabase > SQL Editor.

alter table public.backlog_items
  add column my_estimate_hours smallint
    check (my_estimate_hours between 1 and 999);

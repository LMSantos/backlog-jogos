-- Step 7: link a Steam account to a profile.
-- Run once in Supabase > SQL Editor.

alter table public.profiles
  add column steam_id text unique
    check (steam_id ~ '^[0-9]{17}$');

-- Only the server may write steam_id, after Steam confirms the login
-- (OpenID). Browsers keep reading every column, but may only insert or
-- update the columns below. Column privileges sit on top of RLS: the
-- policies still decide which rows.
revoke insert, update on public.profiles from authenticated;
grant insert (id, username, display_name, avatar_url)
  on public.profiles to authenticated;
grant update (username, display_name, avatar_url)
  on public.profiles to authenticated;

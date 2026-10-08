-- Step 11: the app becomes personal. Each user can only READ their own
-- profile, backlog and achievement progress (writes were already own-only).
-- Run once in Supabase > SQL Editor.

-- Old "everyone logged in can read" policies.
drop policy "Logged-in users can read profiles" on public.profiles;
drop policy "Logged-in users can read backlogs" on public.backlog_items;
drop policy achievement_progress_readable_by_logged_in
  on public.steam_achievement_progress;

create policy profiles_read_own
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy backlog_items_read_own
  on public.backlog_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy achievement_progress_read_own
  on public.steam_achievement_progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Note: the username stays unique. The unique constraint is checked by the
-- database itself, so onboarding still rejects a taken username even though
-- users can no longer see each other's profiles.

-- Step 16: the "Plano" screen.
-- Run once in Supabase > SQL Editor.

-- Position in the plan queue. null = not in the plan. Only games in the plan
-- take part in the plan's months, hours and progress.
alter table public.backlog_items
  add column plan_position integer check (plan_position >= 0);

create index backlog_items_user_plan_idx
  on public.backlog_items (user_id, plan_position)
  where plan_position is not null;

-- Hours per week available to play.
alter table public.profiles
  add column weekly_hours smallint check (weekly_hours between 1 and 100);

-- profiles has column-level grants (migration 0002): browsers may only
-- update the listed columns, so the new one must be added explicitly.
grant update (weekly_hours) on public.profiles to authenticated;

"use server";

import { revalidateBacklogPages } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";

type Failure = { ok: false; error: string };
export type PlanActionResult = { ok: true } | Failure;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAVE_FAILED: Failure = {
  ok: false,
  error: "Não foi possível salvar. Tente de novo.",
};
const SESSION_EXPIRED: Failure = {
  ok: false,
  error: "Sua sessão expirou. Entre de novo.",
};

async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims.sub ?? null };
}

export async function setWeeklyHours(
  hours: number | null,
): Promise<PlanActionResult> {
  const valid =
    hours === null || (Number.isInteger(hours) && hours >= 1 && hours <= 100);
  if (!valid) {
    return { ok: false, error: "Use um número inteiro de horas, de 1 a 100." };
  }
  const { supabase, userId } = await getSessionUser();
  if (!userId) return SESSION_EXPIRED;

  const { error } = await supabase
    .from("profiles")
    .update({ weekly_hours: hours })
    .eq("id", userId);
  if (error) return SAVE_FAILED;

  revalidateBacklogPages();
  return { ok: true };
}

// The user's plan queue, in order (only games that can still be played).
async function activeQueue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from("backlog_items")
    .select("id, plan_position")
    .eq("user_id", userId)
    .not("plan_position", "is", null)
    .order("plan_position");
  return (data ?? []) as { id: string; plan_position: number }[];
}

export async function addToPlan(itemId: string): Promise<PlanActionResult> {
  if (!UUID_PATTERN.test(itemId)) return SAVE_FAILED;
  const { supabase, userId } = await getSessionUser();
  if (!userId) return SESSION_EXPIRED;

  const queue = await activeQueue(supabase, userId);
  const nextPosition = queue.length
    ? Math.max(...queue.map((row) => row.plan_position)) + 1
    : 0;

  const { data, error } = await supabase
    .from("backlog_items")
    .update({ plan_position: nextPosition })
    .eq("id", itemId)
    .eq("user_id", userId)
    .is("plan_position", null)
    .select("id");
  if (error || !data?.length) return SAVE_FAILED;

  revalidateBacklogPages();
  return { ok: true };
}

export async function removeFromPlan(itemId: string): Promise<PlanActionResult> {
  if (!UUID_PATTERN.test(itemId)) return SAVE_FAILED;
  const { supabase, userId } = await getSessionUser();
  if (!userId) return SESSION_EXPIRED;

  const { error } = await supabase
    .from("backlog_items")
    .update({ plan_position: null })
    .eq("id", itemId)
    .eq("user_id", userId);
  if (error) return SAVE_FAILED;

  revalidateBacklogPages();
  return { ok: true };
}

// Moves a game one place up or down in the queue. Finished games keep their
// position, so `neighborId` (the game shown above/below on screen) is the
// one to swap with.
export async function swapPlanItems(
  itemId: string,
  neighborId: string,
): Promise<PlanActionResult> {
  if (!UUID_PATTERN.test(itemId) || !UUID_PATTERN.test(neighborId)) {
    return SAVE_FAILED;
  }
  const { supabase, userId } = await getSessionUser();
  if (!userId) return SESSION_EXPIRED;

  // Renumber 0..n-1 first, so duplicated positions can't block a swap.
  const order = (await activeQueue(supabase, userId)).map((row) => row.id);
  const from = order.indexOf(itemId);
  const to = order.indexOf(neighborId);
  if (from === -1 || to === -1) return SAVE_FAILED;
  [order[from], order[to]] = [order[to], order[from]];

  const results = await Promise.all(
    order.map((id, position) =>
      supabase
        .from("backlog_items")
        .update({ plan_position: position })
        .eq("id", id)
        .eq("user_id", userId),
    ),
  );
  if (results.some((result) => result.error)) return SAVE_FAILED;

  revalidateBacklogPages();
  return { ok: true };
}

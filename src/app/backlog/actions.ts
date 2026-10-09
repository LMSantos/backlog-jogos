"use server";

import {
  NOTES_MAX_LENGTH,
  isMyPlatform,
  isPriority,
  isStatus,
  type Status,
} from "@/lib/backlog";
import { revalidateBacklogPages } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";

type Failure = { ok: false; error: string };
export type ActionResult = { ok: true } | Failure;
export type StatusResult =
  | { ok: true; startedAt: string | null; finishedAt: string | null }
  | Failure;

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

// RLS already blocks changes to other users' rows; filtering by user_id too
// makes the intent explicit and lets us detect "not found".
async function updateOwnItem(
  itemId: string,
  changes: Record<string, unknown>,
): Promise<ActionResult> {
  if (!UUID_PATTERN.test(itemId)) return SAVE_FAILED;

  const { supabase, userId } = await getSessionUser();
  if (!userId) return SESSION_EXPIRED;

  const { data, error } = await supabase
    .from("backlog_items")
    .update(changes)
    .eq("id", itemId)
    .eq("user_id", userId)
    .select("id");

  if (error || !data?.length) return SAVE_FAILED;
  revalidateBacklogPages();
  return { ok: true };
}

export async function updateStatus(
  itemId: string,
  status: Status,
): Promise<StatusResult> {
  if (!UUID_PATTERN.test(itemId) || !isStatus(status)) return SAVE_FAILED;

  const { supabase, userId } = await getSessionUser();
  if (!userId) return SESSION_EXPIRED;

  const { data: current } = await supabase
    .from("backlog_items")
    .select("started_at")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle<{ started_at: string | null }>();
  if (!current) return SAVE_FAILED;

  const now = new Date().toISOString();
  // Keep the first start date; set it when the game is started or finished.
  const startedAt =
    current.started_at ??
    (status === "playing" || status === "finished" ? now : null);
  // A finished date only makes sense while the game stays finished.
  const finishedAt = status === "finished" ? now : null;

  const result = await updateOwnItem(itemId, {
    status,
    started_at: startedAt,
    finished_at: finishedAt,
  });
  return result.ok ? { ok: true, startedAt, finishedAt } : result;
}

export async function updatePriority(
  itemId: string,
  priority: number,
): Promise<ActionResult> {
  if (!isPriority(priority)) return SAVE_FAILED;
  return updateOwnItem(itemId, { priority });
}

export async function updateRating(
  itemId: string,
  rating: number | null,
): Promise<ActionResult> {
  const valid =
    rating === null || (Number.isInteger(rating) && rating >= 1 && rating <= 10);
  if (!valid) return SAVE_FAILED;
  return updateOwnItem(itemId, { rating });
}

export async function removeItem(itemId: string): Promise<ActionResult> {
  if (!UUID_PATTERN.test(itemId)) return SAVE_FAILED;

  const { supabase, userId } = await getSessionUser();
  if (!userId) return SESSION_EXPIRED;

  const { data, error } = await supabase
    .from("backlog_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId)
    .select("id");

  if (error || !data?.length) {
    return { ok: false, error: "Não foi possível remover. Tente de novo." };
  }
  revalidateBacklogPages();
  return { ok: true };
}

export async function updateMyPlatform(
  itemId: string,
  platform: string | null,
): Promise<ActionResult> {
  if (platform !== null && !isMyPlatform(platform)) return SAVE_FAILED;
  return updateOwnItem(itemId, { my_platform: platform });
}

// Personal comment about the game ("how it was to finish it back then").
// Private like the rest of the backlog: RLS lets only the owner read it.
export async function updateNotes(
  itemId: string,
  notes: string,
): Promise<ActionResult> {
  if (typeof notes !== "string") return SAVE_FAILED;
  const trimmed = notes.trim();
  if (trimmed.length > NOTES_MAX_LENGTH) {
    return {
      ok: false,
      error: `O comentário pode ter até ${NOTES_MAX_LENGTH} caracteres.`,
    };
  }
  return updateOwnItem(itemId, { notes: trimmed || null });
}

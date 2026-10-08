"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { USERNAME_PATTERN } from "@/lib/username";

export type OnboardingState = { error?: string; username?: string };

export async function createProfile(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();

  if (!USERNAME_PATTERN.test(username)) {
    return {
      error: "Use de 3 a 20 caracteres: letras minúsculas, números ou _.",
      username,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Google fills these; magic link users start with the username as name.
  const meta = user.user_metadata;
  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    username,
    display_name: meta.full_name ?? meta.name ?? username,
    avatar_url: meta.avatar_url ?? null,
  });

  if (error) {
    // 23505 = unique violation. On the primary key it means the profile
    // already exists (e.g. form sent twice), so just move on.
    if (error.code === "23505" && error.message.includes("profiles_pkey")) {
      redirect("/");
    }
    if (error.code === "23505") {
      return { error: "Esse nome de usuário já está em uso.", username };
    }
    return { error: "Não foi possível salvar. Tente novamente.", username };
  }

  redirect("/");
}

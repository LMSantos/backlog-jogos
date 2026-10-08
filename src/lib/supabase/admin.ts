import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// Supabase client with the SECRET key: it bypasses RLS and column grants.
// Use only for writes the browser must never do on its own (e.g. saving a
// steam_id that Steam has just confirmed), and always scope them to the
// logged-in user's id.
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY. Add it to .env.local.");
  }
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

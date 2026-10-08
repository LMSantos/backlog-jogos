// NEXT_PUBLIC_ variables are inlined into the browser bundle by Next.js.
// That is fine here: the publishable key is meant to be public, and
// Row Level Security is what protects the data.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.example to .env.local and fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}

export const supabaseUrl = url;
export const supabasePublishableKey = publishableKey;

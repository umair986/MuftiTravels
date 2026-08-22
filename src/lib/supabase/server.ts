import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServerClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    // No `cache: "no-store"` override here on purpose. Caching is controlled
    // per-read in lib/packages.server.ts, which tags its entries so an admin
    // save can clear them. Forcing no-store globally defeated Next's data
    // cache and sent every page view straight to the database.
  );
}

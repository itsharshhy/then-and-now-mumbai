import type { SupabaseClient } from "@supabase/supabase-js";

// One browser client for the whole site (multiplayer rooms + the bazaar). Loaded lazily so pages that never
// touch Supabase don't download it. Configured by the public values in .env.

export const supabaseConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

let client: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  if (!supabaseConfigured()) return Promise.reject(new Error("Supabase is not configured"));
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 20 } },
    }),
  );
  return client;
}

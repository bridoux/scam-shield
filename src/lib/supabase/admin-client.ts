import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { publicSupabaseEnv } from "./env";

export type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Service-role client: bypasses Row Level Security. App code imports it through
 * `./admin` (server-only); scripts and DB tests import this file directly.
 */
export function createAdminClient() {
  const { url } = publicSupabaseEnv();
  return createClient<Database>(url, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The service role key. Server-only: it bypasses Row Level Security. */
function serviceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. See README → Develop.");
  return key;
}

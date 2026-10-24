import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { publicSupabaseEnv } from "./env";

/** Supabase client for Client Components, acting as the signed-in user (RLS applies). */
export function createClient() {
  const { url, anonKey } = publicSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}

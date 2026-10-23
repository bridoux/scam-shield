/** Supabase settings that are safe in the browser. */
export function publicSupabaseEnv(): { url: string; anonKey: string } {
  // Read each variable by its literal name so Next can inline them into client bundles.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. See README → Develop.");
  }
  return { url, anonKey };
}


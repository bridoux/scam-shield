/** The live database. Tests create and delete users, so they must never run against it. */
export const PRODUCTION_PROJECT_REF = "dqqqvfghukcjqtwlyxzj";

/** Throws unless the environment's Supabase URL points at a project other than production. */
export function assertTestDatabase(env: Record<string, string | undefined> = process.env): void {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set: put the test project's keys in .env.test.local.");

  const ref = new URL(url).hostname.split(".")[0];
  if (ref === PRODUCTION_PROJECT_REF) {
    throw new Error(`Refusing to run tests against the production database (${ref}): put the test project's keys in .env.test.local.`);
  }
}

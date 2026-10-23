/**
 * Upserts scenarios from src/data/scenarios.<locale>.json into Supabase as "approved".
 * Scenarios in the database that are no longer in the JSON are marked "retired"
 * (not deleted: past answers still reference them).
 *
 * Run with `npm run db:seed`, which runs the content checks first.
 */
import { getScenarios } from "../src/lib/content";
import { createAdminClient } from "../src/lib/supabase/admin-client";
import { scenarioToRow } from "../src/lib/scenario-rows";
import type { Locale } from "../src/lib/types";

const LOCALES: readonly Locale[] = ["en-US"];

async function main() {
  const db = createAdminClient();

  for (const locale of LOCALES) {
    const rows = getScenarios(locale).map((s) => ({ ...scenarioToRow(s), status: "approved", updated_at: new Date().toISOString() }));
    const { error } = await db.from("scenarios").upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`Upserting ${locale} scenarios failed: ${error.message}`);

    const keep = new Set(rows.map((r) => r.id));
    const { data: existing, error: listError } = await db
      .from("scenarios")
      .select("id")
      .eq("locale", locale)
      .neq("status", "retired");
    if (listError) throw new Error(`Listing ${locale} scenarios failed: ${listError.message}`);

    const stale = (existing ?? []).map((r) => r.id).filter((id) => !keep.has(id));
    if (stale.length > 0) {
      const { error: retireError } = await db.from("scenarios").update({ status: "retired" }).in("id", stale);
      if (retireError) throw new Error(`Retiring stale scenarios failed: ${retireError.message}`);
    }

    process.stdout.write(`${locale}: ${rows.length} approved, ${stale.length} retired\n`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

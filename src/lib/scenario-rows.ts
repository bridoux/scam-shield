import type { Database } from "./supabase/database.types";
import type { CardLink, Scenario } from "./types";

export type ScenarioRow = Database["public"]["Tables"]["scenarios"]["Row"];
type ScenarioInsert = Database["public"]["Tables"]["scenarios"]["Insert"];

/** Maps a content scenario to its database columns (status is set by the caller). */
export function scenarioToRow(s: Scenario): ScenarioInsert {
  return {
    id: s.id,
    locale: s.locale,
    channel: s.channel,
    industry: s.industry,
    scam_type: s.scamType,
    difficulty: s.difficulty,
    verdict: s.verdict,
    sender_name: s.sender.name,
    sender_address: s.sender.address,
    subject: s.subject ?? null,
    body: s.body,
    links: (s.links ?? []) as unknown as ScenarioInsert["links"],
    red_flags: s.redFlags as unknown as ScenarioInsert["red_flags"],
    legit_reason: s.legitReason ?? null,
    tip: s.tip,
  };
}

/** Maps a database row back to the shape the game uses. Values are trusted: the DB checks them. */
export function rowToScenario(row: ScenarioRow): Scenario {
  const links = row.links as unknown as CardLink[];
  return {
    id: row.id,
    locale: row.locale as Scenario["locale"],
    channel: row.channel as Scenario["channel"],
    industry: row.industry as Scenario["industry"],
    scamType: row.scam_type,
    difficulty: row.difficulty as Scenario["difficulty"],
    verdict: row.verdict as Scenario["verdict"],
    sender: { name: row.sender_name, address: row.sender_address },
    ...(row.subject === null ? {} : { subject: row.subject }),
    body: row.body,
    ...(links.length > 0 ? { links } : {}),
    redFlags: row.red_flags as unknown as Scenario["redFlags"],
    ...(row.legit_reason === null ? {} : { legitReason: row.legit_reason }),
    tip: row.tip,
  };
}

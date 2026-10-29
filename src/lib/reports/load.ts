import "server-only";
import { getSession, type Member } from "../auth";
import { localDate } from "../play/dates";
import { createClient } from "../supabase/server";
import { parsePeriod, type Period } from "./period";
import { buildRecord, type TrainingRecord } from "./record";

export type RecordAccess =
  | { ok: true; member: Member; record: TrainingRecord }
  | { ok: false; reason: "signed_out" | "no_company" | "forbidden" };

export type Params = { range?: unknown; from?: unknown; to?: unknown };

/**
 * The training record for the signed-in owner or admin. The database functions repeat the
 * role check and scope everything to the caller's company, so this check is for a clean
 * response, not the only guard.
 */
export async function loadTrainingRecord(params: Params): Promise<RecordAccess> {
  const access = await recordManager();
  return access.ok ? loadRecordFor(access.member, params) : access;
}

/** The signed-in owner or admin, or why they can't see the record. Cheap: no report query. */
export async function recordManager(): Promise<{ ok: true; member: Member } | { ok: false; reason: "signed_out" | "no_company" | "forbidden" }> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "signed_out" };
  const member = session.member;
  if (!member) return { ok: false, reason: "no_company" };
  if (member.role !== "owner" && member.role !== "admin") return { ok: false, reason: "forbidden" };
  return { ok: true, member };
}

/** The training record for a member already checked by recordManager. */
export async function loadRecordFor(member: Member, params: Params): Promise<RecordAccess> {
  const today = localDate(new Date(), member.timeZone);
  const period: Period = parsePeriod(params, today);
  const client = await createClient();
  const args = { p_from: period.from, p_to: period.to };
  const [report, topics] = await Promise.all([client.rpc("training_report", args), client.rpc("training_topics", args)]);
  if (report.error?.hint === "not_authorized" || topics.error?.hint === "not_authorized") return { ok: false, reason: "forbidden" };
  if (report.error) throw new Error(`Loading the training record failed: ${report.error.message}`);
  if (topics.error) throw new Error(`Loading training topics failed: ${topics.error.message}`);

  const rows = report.data.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    email: r.email ?? "",
    teamName: r.team_name,
    role: r.role,
    joinedOn: r.joined_on,
    leftOn: r.left_on,
    roundDates: r.round_dates,
    cards: r.cards,
    correct: r.correct,
    points: r.points,
  }));
  const topicRows = topics.data.map((t) => ({ scamType: t.scam_type, attempts: t.attempts, misses: t.misses }));
  return { ok: true, member, record: buildRecord(rows, topicRows, member.playDays, period, today) };
}

/** "Lakeshore Motors" + period → "scam-shield-training-record-lakeshore-motors-2026-10-01-to-2026-10-30". */
export function recordFileName(companyName: string, period: Period): string {
  const slug = companyName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return ["scam-shield-training-record", slug, period.from, "to", period.to].filter(Boolean).join("-");
}

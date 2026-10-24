/**
 * Server-checked play. Every function takes a service-role client and the
 * already-authenticated user id; callers must never pass a user id from the client.
 */
import { pickRound, scoreAnswer, summarizeRound, POINTS_PER_CORRECT, type AnswerResult, type Rng } from "../round";
import { rowToScenario, type ScenarioRow } from "../scenario-rows";
import type { AdminClient } from "../supabase/admin-client";
import { toPublicCard, toReveal, type Locale, type Scenario, type Verdict } from "../types";
import { localDate } from "./dates";
import type { AnsweredCard, FinishedRound, PlayErrorCode, StartedRound } from "./types";

const LOCALE: Locale = "en-US";
const UNIQUE_VIOLATION = "23505";

export class PlayError extends Error {
  constructor(
    readonly code: PlayErrorCode,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "PlayError";
  }
}

interface AnswerRow {
  position: number;
  scenario_id: string;
  answer: string | null;
  is_correct: boolean | null;
  streak: number | null;
  points: number | null;
}

interface AnswerRowWithScenario extends AnswerRow {
  scenarios: ScenarioRow | null;
}

interface StartOptions {
  now?: Date;
  rng?: Rng;
}

/** Resumes today's open round, or starts a new one (practice if today's record round is done). */
export async function startRound(db: AdminClient, userId: string, options: StartOptions = {}): Promise<StartedRound> {
  const { now = new Date(), rng = Math.random } = options;
  const membership = await getMembership(db, userId);
  const roundDate = localDate(now, membership.timeZone);

  for (let attempt = 0; attempt < 3; attempt++) {
    const today = await roundsOn(db, userId, roundDate);
    const open = today.find((r) => r.completed_at === null);
    if (open) {
      const resumed = await resumeRound(db, open.id, open.is_practice);
      if (resumed.cards.length > 0) return resumed;
      // Left empty by a failed start; discard it so the player isn't stuck for the day.
      await db.from("rounds").delete().eq("id", open.id);
      continue;
    }

    const isPractice = today.some((r) => !r.is_practice);
    const created = await createRound(db, userId, membership.organizationId, roundDate, isPractice, rng);
    if (created) return created;
    // Another tab created today's record round at the same moment; loop to resume it.
  }
  throw new PlayError("server_error", "could not start a round");
}

export async function submitAnswer(
  db: AdminClient,
  userId: string,
  roundId: string,
  position: number,
  choice: Verdict,
): Promise<AnsweredCard> {
  if (!isRoundId(roundId) || !Number.isInteger(position) || position < 0 || (choice !== "legit" && choice !== "scam")) {
    throw new PlayError("invalid_input");
  }
  // Fetched together to save a round trip; the rows are only used once ownership is confirmed.
  const [round, rows] = await Promise.all([getOwnRound(db, userId, roundId), answerRowsWithScenarios(db, roundId)]);
  if (round.completed_at !== null) throw new PlayError("round_closed");

  const row = rows[position];
  if (!row) throw new PlayError("not_found", `position ${position}`);
  if (row.answer === null && rows.slice(0, position).some((r) => r.answer === null)) {
    throw new PlayError("out_of_order");
  }

  const scenario = rowToScenario(requireScenario(row));
  // Answering twice (double tap, retry) returns the first answer unchanged.
  if (row.answer !== null) return answeredCard(scenario, row);

  const previousStreak = position === 0 ? 0 : (rows[position - 1].streak ?? 0);
  const result = scoreAnswer(scenario, choice, previousStreak);
  const { data: updated, error } = await db
    .from("round_answers")
    .update({
      answer: choice,
      is_correct: result.correct,
      streak: result.streak,
      points: result.basePoints + result.bonusPoints,
      answered_at: new Date().toISOString(),
    })
    .eq("round_id", roundId)
    .eq("position", position)
    .is("answered_at", null)
    .select("position, scenario_id, answer, is_correct, streak, points");
  if (error) throw new PlayError("server_error", error.message);

  if (!updated || updated.length === 0) {
    const fresh = (await answerRows(db, roundId))[position];
    return answeredCard(scenario, fresh);
  }
  return { position, reveal: toReveal(scenario), result };
}

export async function finishRound(db: AdminClient, userId: string, roundId: string): Promise<FinishedRound> {
  const round = await getOwnRound(db, userId, roundId);
  const rows = await answerRowsWithScenarios(db, roundId);
  if (rows.length === 0 || rows.some((r) => r.answer === null)) throw new PlayError("incomplete");

  const scenarios = rows.map((r) => rowToScenario(requireScenario(r)));
  const results = rows.map((r, i) => resultFromRow(scenarios[i], r));
  const summary = summarizeRound(scenarios, results);

  if (round.completed_at === null) {
    const { error } = await db
      .from("rounds")
      .update({
        completed_at: new Date().toISOString(),
        score: summary.correct,
        points: summary.points,
        best_streak: summary.bestStreak,
      })
      .eq("id", roundId)
      .is("completed_at", null);
    if (error) throw new PlayError("server_error", error.message);
  }
  return { isPractice: round.is_practice, summary };
}

// ---------------------------------------------------------------------------

async function getMembership(db: AdminClient, userId: string) {
  const { data, error } = await db
    .from("memberships")
    .select("organization_id, organizations(time_zone)")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new PlayError("server_error", error.message);
  if (!data) throw new PlayError("no_membership");
  return { organizationId: data.organization_id, timeZone: data.organizations?.time_zone ?? "UTC" };
}

async function roundsOn(db: AdminClient, userId: string, roundDate: string) {
  const { data, error } = await db
    .from("rounds")
    .select("id, is_practice, completed_at")
    .eq("user_id", userId)
    .eq("round_date", roundDate)
    .order("started_at", { ascending: false });
  if (error) throw new PlayError("server_error", error.message);
  return data;
}

async function getOwnRound(db: AdminClient, userId: string, roundId: string) {
  if (!isRoundId(roundId)) throw new PlayError("invalid_input");
  const { data, error } = await db
    .from("rounds")
    .select("id, is_practice, completed_at")
    .eq("id", roundId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new PlayError("server_error", error.message);
  if (!data) throw new PlayError("not_found");
  return data;
}

async function createRound(
  db: AdminClient,
  userId: string,
  organizationId: string,
  roundDate: string,
  isPractice: boolean,
  rng: Rng,
): Promise<StartedRound | null> {
  const { data: pool, error: poolError } = await db
    .from("scenarios")
    .select("*")
    .eq("locale", LOCALE)
    .eq("status", "approved");
  if (poolError) throw new PlayError("server_error", poolError.message);
  const picked = pickRound(pool.map(rowToScenario), { rng });
  if (picked.length === 0) throw new PlayError("no_scenarios");

  const { data: round, error } = await db
    .from("rounds")
    .insert({
      user_id: userId,
      organization_id: organizationId,
      round_date: roundDate,
      is_practice: isPractice,
      card_count: picked.length,
    })
    .select("id")
    .single();
  if (error?.code === UNIQUE_VIOLATION) return null;
  if (error) throw new PlayError("server_error", error.message);

  const { error: cardsError } = await db
    .from("round_answers")
    .insert(picked.map((s, position) => ({ round_id: round.id, position, scenario_id: s.id })));
  if (cardsError) {
    await db.from("rounds").delete().eq("id", round.id);
    throw new PlayError("server_error", cardsError.message);
  }
  return { roundId: round.id, isPractice, cards: picked.map(toPublicCard), answered: [] };
}

async function resumeRound(db: AdminClient, roundId: string, isPractice: boolean): Promise<StartedRound> {
  const rows = await answerRowsWithScenarios(db, roundId);
  const scenarios = rows.map((r) => rowToScenario(requireScenario(r)));
  return {
    roundId,
    isPractice,
    cards: scenarios.map(toPublicCard),
    answered: rows.flatMap((r, i) => (r.answer === null ? [] : [answeredCard(scenarios[i], r)])),
  };
}

async function answerRows(db: AdminClient, roundId: string): Promise<AnswerRow[]> {
  const { data, error } = await db
    .from("round_answers")
    .select("position, scenario_id, answer, is_correct, streak, points")
    .eq("round_id", roundId)
    .order("position");
  if (error) throw new PlayError("server_error", error.message);
  return data;
}

async function answerRowsWithScenarios(db: AdminClient, roundId: string): Promise<AnswerRowWithScenario[]> {
  const { data, error } = await db
    .from("round_answers")
    .select("position, scenario_id, answer, is_correct, streak, points, scenarios(*)")
    .eq("round_id", roundId)
    .order("position");
  if (error) throw new PlayError("server_error", error.message);
  return data;
}

function isRoundId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function requireScenario(row: AnswerRowWithScenario): ScenarioRow {
  if (!row.scenarios) throw new PlayError("server_error", `missing scenario ${row.scenario_id}`);
  return row.scenarios;
}

function resultFromRow(scenario: Scenario, row: AnswerRow): AnswerResult {
  const correct = row.is_correct === true;
  const basePoints = correct ? POINTS_PER_CORRECT : 0;
  return {
    scenarioId: scenario.id,
    choice: row.answer as Verdict,
    correct,
    streak: row.streak ?? 0,
    basePoints,
    bonusPoints: Math.max(0, (row.points ?? 0) - basePoints),
  };
}

function answeredCard(scenario: Scenario, row: AnswerRow): AnsweredCard {
  return { position: row.position, reveal: toReveal(scenario), result: resultFromRow(scenario, row) };
}

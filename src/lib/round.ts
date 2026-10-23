import type { Scenario, Verdict } from "./types";

export const ROUND_SIZE = 10;
export const POINTS_PER_CORRECT = 10;
export const STREAK_BONUS = 5;
/** The streak bonus applies from this many correct answers in a row. */
export const STREAK_BONUS_FROM = 3;

/** Returns a float in [0, 1), like Math.random. Injected so rounds are testable. */
export type Rng = () => number;

/** Small seeded PRNG (mulberry32) for reproducible rounds in tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface PickOptions {
  size?: number;
  rng?: Rng;
  /** Share of scam cards; the actual count varies by ±1 so the mix isn't predictable. */
  scamShare?: number;
}

/**
 * Picks a round of cards with a spread of channels and difficulties and a
 * realistic scam/legit mix, then orders it from easier to harder (with jitter).
 */
export function pickRound(pool: readonly Scenario[], options: PickOptions = {}): Scenario[] {
  const { size = ROUND_SIZE, rng = Math.random, scamShare = 0.6 } = options;
  const target = Math.min(size, pool.length);

  const scamsAvailable = pool.filter((s) => s.verdict === "scam").length;
  const legitAvailable = pool.length - scamsAvailable;
  const jitter = Math.floor(rng() * 3) - 1; // -1, 0 or +1
  const wantedScams = clamp(
    Math.round(target * scamShare) + jitter,
    Math.max(0, target - legitAvailable),
    Math.min(scamsAvailable, target),
  );
  const quota: Record<Verdict, number> = { scam: wantedScams, legit: target - wantedScams };

  const channelCount = new Map<string, number>();
  const difficultyCount = new Map<number, number>();
  const picked: Scenario[] = [];
  let remaining = shuffle(pool, rng);

  while (picked.length < target) {
    let best = -1;
    let bestScore = Infinity;
    remaining.forEach((s, i) => {
      if (quota[s.verdict] <= 0) return;
      // Prefer channels and difficulties we have used least so far.
      const score =
        (channelCount.get(s.channel) ?? 0) * 2 + (difficultyCount.get(s.difficulty) ?? 0);
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best === -1) break;
    const card = remaining[best];
    picked.push(card);
    quota[card.verdict]--;
    channelCount.set(card.channel, (channelCount.get(card.channel) ?? 0) + 1);
    difficultyCount.set(card.difficulty, (difficultyCount.get(card.difficulty) ?? 0) + 1);
    remaining = remaining.filter((_, i) => i !== best);
  }

  // Gentle ramp: easier cards tend to come first, but not in strict order.
  return picked
    .map((card) => ({ card, key: card.difficulty + rng() * 2.5 }))
    .sort((a, b) => a.key - b.key)
    .map(({ card }) => card);
}

export interface AnswerResult {
  scenarioId: string;
  choice: Verdict;
  correct: boolean;
  /** Correct answers in a row, including this one (0 if wrong). */
  streak: number;
  basePoints: number;
  bonusPoints: number;
}

export function scoreAnswer(scenario: Scenario, choice: Verdict, previousStreak: number): AnswerResult {
  const correct = scenario.verdict === choice;
  const streak = correct ? previousStreak + 1 : 0;
  return {
    scenarioId: scenario.id,
    choice,
    correct,
    streak,
    basePoints: correct ? POINTS_PER_CORRECT : 0,
    bonusPoints: correct && streak >= STREAK_BONUS_FROM ? STREAK_BONUS : 0,
  };
}

export interface MissedType {
  scamType: string;
  count: number;
}

export interface RoundSummary {
  total: number;
  correct: number;
  /** 0–100, rounded. */
  accuracy: number;
  basePoints: number;
  bonusPoints: number;
  points: number;
  bestStreak: number;
  /** Scams marked "legit", grouped by scam type, most-missed first. */
  missedScams: MissedType[];
  /** Legit messages marked "scam". */
  falseAlarms: number;
}

export function summarizeRound(round: readonly Scenario[], answers: readonly AnswerResult[]): RoundSummary {
  const byId = new Map(round.map((s) => [s.id, s]));
  const missed = new Map<string, number>();
  let correct = 0;
  let basePoints = 0;
  let bonusPoints = 0;
  let bestStreak = 0;
  let falseAlarms = 0;

  for (const a of answers) {
    basePoints += a.basePoints;
    bonusPoints += a.bonusPoints;
    bestStreak = Math.max(bestStreak, a.streak);
    if (a.correct) {
      correct++;
      continue;
    }
    const scenario = byId.get(a.scenarioId);
    if (!scenario) continue;
    if (scenario.verdict === "scam") {
      missed.set(scenario.scamType, (missed.get(scenario.scamType) ?? 0) + 1);
    } else {
      falseAlarms++;
    }
  }

  const total = answers.length;
  return {
    total,
    correct,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
    basePoints,
    bonusPoints,
    points: basePoints + bonusPoints,
    bestStreak,
    missedScams: [...missed.entries()]
      .map(([scamType, count]) => ({ scamType, count }))
      .sort((a, b) => b.count - a.count || a.scamType.localeCompare(b.scamType)),
    falseAlarms,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

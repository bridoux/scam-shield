import { pickRound, ROUND_SIZE, type Rng } from "../round";
import type { Industry, Scenario } from "../types";
import { daysBetween } from "./calendar";

/** A card the player has already answered. */
export interface PastAnswer {
  scenarioId: string;
  scamType: string;
  correct: boolean;
  /** Company-local day it was answered, "YYYY-MM-DD". */
  day: string;
}

export interface SkillProfile {
  /** Most recent day each card was seen. */
  lastSeen: Map<string, string>;
  /** Attempts and misses per scam type ("none" = legit cards, where a miss is a false alarm). */
  byType: Map<string, { attempts: number; misses: number }>;
  /** Share correct over the most recent answers, or null for a new player. */
  recentAccuracy: number | null;
}

/** Answers used for the recent-accuracy estimate. */
const RECENT_WINDOW = 30;
export const NO_REPEAT_DAYS = 30;

/** Builds a profile from answers in any order. */
export function buildProfile(answers: readonly PastAnswer[]): SkillProfile {
  const lastSeen = new Map<string, string>();
  const byType = new Map<string, { attempts: number; misses: number }>();
  for (const a of answers) {
    const seen = lastSeen.get(a.scenarioId);
    if (!seen || a.day > seen) lastSeen.set(a.scenarioId, a.day);
    const t = byType.get(a.scamType) ?? { attempts: 0, misses: 0 };
    byType.set(a.scamType, { attempts: t.attempts + 1, misses: t.misses + (a.correct ? 0 : 1) });
  }
  const recent = [...answers].sort((a, b) => b.day.localeCompare(a.day)).slice(0, RECENT_WINDOW);
  const recentAccuracy = recent.length === 0 ? null : recent.filter((a) => a.correct).length / recent.length;
  return { lastSeen, byType, recentAccuracy };
}

/** Difficulty the player is ready for: 1.5 for a struggling player up to 4.5 for a sharp one. */
export function targetDifficulty(profile: SkillProfile): number {
  return profile.recentAccuracy === null ? 2.5 : 1.5 + profile.recentAccuracy * 3;
}

/** How much this card should be favored for this player. Always > 0. */
export function cardWeight(card: Scenario, profile: SkillProfile, industry: Industry): number {
  let weight = 1;

  // The company's own industry first, general office scams always, other industries occasionally.
  if (industry !== "general" && card.industry !== "general") weight *= card.industry === industry ? 1.6 : 0.35;

  // Scam types (or legit messages) the player gets wrong come up more. Unseen types sit in the middle.
  const stats = profile.byType.get(card.scamType) ?? { attempts: 0, misses: 0 };
  const missRate = (stats.misses + 1) / (stats.attempts + 2);
  weight *= 0.6 + 2 * missRate;

  // Difficulty near what the player is ready for.
  const gap = card.difficulty - targetDifficulty(profile);
  weight *= Math.max(0.15, Math.exp(-(gap * gap) / 2.5));

  return weight;
}

/** Cards not seen recently, topped up with the least recently seen ones if the pool runs short. */
export function freshCards(pool: readonly Scenario[], profile: SkillProfile, today: string, needed: number): Scenario[] {
  const isFresh = (s: Scenario) => {
    const seen = profile.lastSeen.get(s.id);
    return !seen || daysBetween(seen, today) >= NO_REPEAT_DAYS;
  };
  const fresh = pool.filter(isFresh);
  if (fresh.length >= needed) return fresh;
  const oldest = pool
    .filter((s) => !isFresh(s))
    .sort((a, b) => (profile.lastSeen.get(a.id) ?? "").localeCompare(profile.lastSeen.get(b.id) ?? ""));
  return [...fresh, ...oldest.slice(0, needed - fresh.length)];
}

/** Weighted sampling without replacement (Efraimidis–Spirakis keys). */
function weightedSample<T>(items: readonly T[], weight: (item: T) => number, count: number, rng: Rng): T[] {
  return items
    .map((item) => ({ item, key: Math.pow(rng() || Number.MIN_VALUE, 1 / weight(item)) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map(({ item }) => item);
}

export interface AdaptiveOptions {
  today: string;
  industry: Industry;
  rng?: Rng;
  size?: number;
}

/**
 * Picks a round tuned to the player: fresh cards, weak scam types, the right
 * difficulty and their industry. The candidate set then goes through pickRound,
 * which keeps the ~60/40 scam/legit mix, the channel spread and the easy-to-hard ramp.
 */
export function pickAdaptiveRound(pool: readonly Scenario[], profile: SkillProfile, options: AdaptiveOptions): Scenario[] {
  const { today, industry, rng = Math.random, size = ROUND_SIZE } = options;
  const candidates = freshCards(pool, profile, today, size * 2);
  const weight = (s: Scenario) => cardWeight(s, profile, industry);

  // Sample scams and legit messages separately so pickRound always has enough of each.
  const scams = candidates.filter((s) => s.verdict === "scam");
  const legit = candidates.filter((s) => s.verdict === "legit");
  const shortlist = [
    ...weightedSample(scams, weight, Math.ceil(size * 1.4), rng),
    ...weightedSample(legit, weight, Math.ceil(size * 1.0), rng),
  ];
  return pickRound(shortlist, { size, rng });
}

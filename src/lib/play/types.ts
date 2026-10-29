import type { LevelInfo } from "../progress/levels";
import type { StreakInfo } from "../progress/streak";
import type { AnswerResult, RoundSummary } from "../round";
import type { CardReveal, PublicCard } from "../types";

/** What the server returns once a card has been answered. */
export interface AnsweredCard {
  position: number;
  reveal: CardReveal;
  result: AnswerResult;
}

export interface StartedRound {
  roundId: string;
  /** False for the round that counts toward today's record; true for extra rounds. */
  isPractice: boolean;
  cards: PublicCard[];
  /** Cards already answered when resuming a round, in order. */
  answered: AnsweredCard[];
}

export interface PlayerProgress {
  /** Lifetime points from record rounds (practice excluded). */
  lifetimePoints: number;
  level: LevelInfo;
  streak: StreakInfo;
  /** This week's league position, or null if it couldn't be loaded. */
  league: { rank: number; players: number; weekPoints: number } | null;
}

export interface FinishedRound {
  isPractice: boolean;
  summary: RoundSummary;
  /** Signed-in play only: progress after this round. */
  progress?: PlayerProgress;
}

export type PlayErrorCode =
  | "not_signed_in"
  | "no_membership"
  | "no_scenarios"
  | "not_found"
  | "round_closed"
  | "out_of_order"
  | "incomplete"
  | "invalid_input"
  | "rate_limited"
  | "server_error";

/** Envelope returned by every play server action. */
export type PlayResponse<T> = { ok: true; data: T } | { ok: false; error: PlayErrorCode };

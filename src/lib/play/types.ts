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

export interface FinishedRound {
  isPractice: boolean;
  summary: RoundSummary;
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
  | "server_error";

/** Envelope returned by every play server action. */
export type PlayResponse<T> = { ok: true; data: T } | { ok: false; error: PlayErrorCode };

import { summarizeRound, type AnswerResult } from "@/lib/round";
import type { AnsweredCard, FinishedRound, PlayResponse, StartedRound } from "@/lib/play/types";
import type { PublicCard, Scenario, Verdict } from "@/lib/types";

/** Where a round comes from: the server with saving (signed-in play) or without (the public demo). */
export interface RoundSource {
  start(): Promise<PlayResponse<StartedRound>>;
  answer(roundId: string, position: number, choice: Verdict): Promise<PlayResponse<AnsweredCard>>;
  finish(roundId: string): Promise<PlayResponse<FinishedRound>>;
}

export interface DemoServer {
  start(): Promise<PlayResponse<StartedRound>>;
  answer(token: string, position: number, choice: Verdict, previousStreak: number): Promise<PlayResponse<AnsweredCard>>;
}

/**
 * The public demo. The server deals cards and reveals each verdict after it is answered
 * (no answer key in the page); this side keeps the streak and builds the summary. Nothing is saved.
 */
export function createDemoSource(server: DemoServer): RoundSource {
  let cards: PublicCard[] = [];
  let revealed: Scenario[] = [];
  let results: AnswerResult[] = [];

  return {
    async start() {
      const response = await server.start();
      if (response.ok) {
        cards = response.data.cards;
        revealed = [];
        results = [];
      }
      return response;
    },
    async answer(token, position, choice) {
      if (position !== results.length) return { ok: false, error: "out_of_order" };
      const response = await server.answer(token, position, choice, results.at(-1)?.streak ?? 0);
      if (response.ok) {
        revealed = [...revealed, { ...cards[position], ...response.data.reveal }];
        results = [...results, response.data.result];
      }
      return response;
    },
    async finish() {
      if (cards.length === 0 || results.length !== cards.length) return { ok: false, error: "incomplete" };
      return { ok: true, data: { isPractice: true, summary: summarizeRound(revealed, results) } };
    },
  };
}

"use client";

import type { ReactNode } from "react";
import { finishRoundAction, startRoundAction, submitAnswerAction } from "@/app/actions/play";
import type { UiStrings } from "@/lib/content";
import { Game } from "../Game";
import type { RoundSource } from "./source";

const serverSource: RoundSource = {
  start: () => startRoundAction(),
  answer: (roundId, position, choice) => submitAnswerAction(roundId, position, choice),
  finish: (roundId) => finishRoundAction(roundId),
};

interface LiveGameProps {
  strings: UiStrings;
  startNote: string;
  startCta?: string;
  accessory?: ReactNode;
}

/** Signed-in play: cards come from the server and every answer is checked there. */
export function LiveGame({ strings, startNote, startCta, accessory }: LiveGameProps) {
  return (
    <Game
      source={serverSource}
      strings={strings}
      variant="live"
      startNote={startNote}
      startCta={startCta}
      accessory={accessory}
    />
  );
}

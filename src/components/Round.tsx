"use client";

import { domMax, LazyMotion, MotionConfig } from "framer-motion";
import type { UiStrings } from "@/lib/content";
import type { PlayErrorCode } from "@/lib/play/types";
import type { Scenario, Verdict } from "@/lib/types";
import { EndScreen } from "./EndScreen";
import type { ActiveRound } from "./Game";
import { PlayScreen } from "./PlayScreen";

export interface RoundProps {
  strings: UiStrings;
  variant: "demo" | "live";
  phase: "playing" | "end";
  round: ActiveRound;
  pending: boolean;
  error: PlayErrorCode | null;
  onAnswer: (choice: Verdict) => void;
  onNext: () => void;
  onPlayAgain: () => void;
}

/** Everything after the start screen. Loaded on demand so the start screen stays light. */
export default function Round({ strings, variant, phase, round, pending, error, onAnswer, onNext, onPlayAgain }: RoundProps) {
  // A card is fully known once the server has revealed it.
  const revealed: (Scenario | null)[] = round.cards.map((card, i) => {
    const reveal = round.reveals[i];
    return reveal ? { ...card, ...reveal } : null;
  });

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        {phase === "playing" || !round.summary ? (
          <PlayScreen
            strings={strings}
            cards={round.cards}
            revealed={revealed}
            index={round.index}
            answers={round.answers}
            pending={pending}
            error={error}
            onAnswer={onAnswer}
            onNext={onNext}
          />
        ) : (
          <EndScreen
            strings={strings}
            round={revealed.filter((s): s is Scenario => s !== null)}
            answers={round.answers}
            summary={round.summary}
            saved={variant === "live" ? (round.isPractice ? "practice" : "record") : null}
            playAgainLabel={variant === "live" ? strings.end.practiceAgain : strings.end.playAgain}
            onPlayAgain={onPlayAgain}
          />
        )}
      </MotionConfig>
    </LazyMotion>
  );
}

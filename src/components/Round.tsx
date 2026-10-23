"use client";

import { domMax, LazyMotion, MotionConfig } from "framer-motion";
import type { UiStrings } from "@/lib/content";
import { summarizeRound, type AnswerResult } from "@/lib/round";
import type { Scenario, Verdict } from "@/lib/types";
import { EndScreen } from "./EndScreen";
import { PlayScreen } from "./PlayScreen";

export interface RoundProps {
  strings: UiStrings;
  phase: "playing" | "end";
  round: Scenario[];
  index: number;
  answers: AnswerResult[];
  onAnswer: (choice: Verdict) => void;
  onNext: () => void;
  onPlayAgain: () => void;
}

/** Everything after the start screen. Loaded on demand so the start screen stays light. */
export default function Round({ strings, phase, round, index, answers, onAnswer, onNext, onPlayAgain }: RoundProps) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        {phase === "playing" ? (
          <PlayScreen
            strings={strings}
            round={round}
            index={index}
            answers={answers}
            onAnswer={onAnswer}
            onNext={onNext}
          />
        ) : (
          <EndScreen
            strings={strings}
            round={round}
            answers={answers}
            summary={summarizeRound(round, answers)}
            onPlayAgain={onPlayAgain}
          />
        )}
      </MotionConfig>
    </LazyMotion>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { UiStrings } from "@/lib/content";
import { pickRound, scoreAnswer, type AnswerResult } from "@/lib/round";
import type { Scenario, Verdict } from "@/lib/types";
import { StartScreen } from "./StartScreen";

const loadRound = () => import("./Round");
const Round = dynamic(loadRound, { ssr: false });

type GameState =
  | { phase: "start" }
  | { phase: "playing" | "end"; round: Scenario[]; index: number; answers: AnswerResult[] };

interface GameProps {
  scenarios: Scenario[];
  strings: UiStrings;
}

export function Game({ scenarios, strings }: GameProps) {
  const [state, setState] = useState<GameState>({ phase: "start" });

  const start = useCallback(() => {
    setState({ phase: "playing", round: pickRound(scenarios), index: 0, answers: [] });
    window.scrollTo({ top: 0 });
  }, [scenarios]);

  const answer = useCallback((choice: Verdict) => {
    setState((s) => {
      if (s.phase !== "playing" || s.answers.length > s.index) return s;
      const previousStreak = s.answers.at(-1)?.streak ?? 0;
      return { ...s, answers: [...s.answers, scoreAnswer(s.round[s.index], choice, previousStreak)] };
    });
  }, []);

  const next = useCallback(() => {
    setState((s) => {
      if (s.phase !== "playing" || s.answers.length <= s.index) return s;
      if (s.index + 1 >= s.round.length) return { ...s, phase: "end" };
      return { ...s, index: s.index + 1 };
    });
  }, []);

  if (state.phase === "start") {
    // Start fetching the round UI as soon as the player shows intent to play.
    return <StartScreen strings={strings} onStart={start} onIntent={loadRound} />;
  }

  return (
    <Round
      strings={strings}
      phase={state.phase}
      round={state.round}
      index={state.index}
      answers={state.answers}
      onAnswer={answer}
      onNext={next}
      onPlayAgain={start}
    />
  );
}

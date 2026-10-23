"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState, type ReactNode } from "react";
import type { UiStrings } from "@/lib/content";
import type { AnswerResult, RoundSummary } from "@/lib/round";
import type { PlayErrorCode } from "@/lib/play/types";
import type { CardReveal, PublicCard, Verdict } from "@/lib/types";
import type { RoundSource } from "./game/source";
import { RoundLoading } from "./RoundLoading";
import { StartScreen } from "./StartScreen";

const loadRound = () => import("./Round");
// The round UI is loaded before play starts (see start), so this never shows a blank gap.
const Round = dynamic(loadRound, { ssr: false });

export interface ActiveRound {
  roundId: string;
  isPractice: boolean;
  cards: PublicCard[];
  /** Server reveals, one per answered card. */
  reveals: CardReveal[];
  answers: AnswerResult[];
  index: number;
  summary: RoundSummary | null;
}

type GameState = { phase: "start" } | { phase: "loading" } | ({ phase: "playing" | "end" } & ActiveRound);

interface GameProps {
  source: RoundSource;
  strings: UiStrings;
  /** "demo" shows the no-sign-in note; "live" shows whether the round counts. */
  variant: "demo" | "live";
  /** Start screen line under the button. */
  startNote: string;
  startCta?: string;
  /** Account menu shown on the start screen. */
  accessory?: ReactNode;
}

export function Game({ source, strings, variant, startNote, startCta, accessory }: GameProps) {
  const [state, setState] = useState<GameState>({ phase: "start" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<PlayErrorCode | null>(null);
  // Guards against double taps firing two requests before React re-renders.
  const busy = useRef(false);

  const call = useCallback(async <T,>(fn: () => Promise<{ ok: true; data: T } | { ok: false; error: PlayErrorCode }>) => {
    if (busy.current) return null;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fn();
      if (!response.ok) {
        setError(response.error);
        return null;
      }
      return response.data;
    } catch {
      setError("server_error");
      return null;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, []);

  const start = useCallback(async () => {
    setState({ phase: "loading" });
    window.scrollTo({ top: 0 });
    const [started] = await Promise.all([call(() => source.start()), loadRound()]);
    if (!started) {
      setState({ phase: "start" });
      return;
    }
    const answered = started.answered;
    setState({
      phase: "playing",
      roundId: started.roundId,
      isPractice: started.isPractice,
      cards: started.cards,
      reveals: answered.map((a) => a.reveal),
      answers: answered.map((a) => a.result),
      index: Math.min(answered.length, started.cards.length - 1),
      summary: null,
    });
  }, [call, source]);

  const answer = useCallback(
    async (choice: Verdict) => {
      if (state.phase !== "playing" || state.answers.length > state.index) return;
      const { roundId, index } = state;
      const answered = await call(() => source.answer(roundId, index, choice));
      if (!answered) return;
      setState((s) =>
        s.phase === "playing" && s.roundId === roundId && s.answers.length === index
          ? { ...s, reveals: [...s.reveals, answered.reveal], answers: [...s.answers, answered.result] }
          : s,
      );
    },
    [call, source, state],
  );

  const next = useCallback(async () => {
    if (state.phase !== "playing" || state.answers.length <= state.index) return;
    if (state.index + 1 < state.cards.length) {
      setState({ ...state, index: state.index + 1 });
      return;
    }
    const { roundId } = state;
    const finished = await call(() => source.finish(roundId));
    if (!finished) return;
    setState((s) =>
      s.phase === "playing" && s.roundId === roundId
        ? { ...s, phase: "end", isPractice: finished.isPractice, summary: finished.summary }
        : s,
    );
  }, [call, source, state]);

  if (state.phase === "start") {
    return (
      <StartScreen
        strings={strings}
        note={startNote}
        cta={startCta}
        error={error}
        accessory={accessory}
        onStart={start}
        // Start fetching the round UI as soon as the player shows intent to play.
        onIntent={loadRound}
      />
    );
  }

  if (state.phase === "loading") return <RoundLoading strings={strings} />;

  return (
    <Round
      strings={strings}
      variant={variant}
      round={state}
      phase={state.phase}
      pending={pending}
      error={error}
      onAnswer={answer}
      onNext={next}
      onPlayAgain={start}
    />
  );
}


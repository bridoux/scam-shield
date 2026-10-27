"use client";

import { m } from "framer-motion";
import { useEffect, useRef } from "react";
import { format, type UiStrings } from "@/lib/content";
import type { PlayErrorCode } from "@/lib/play/types";
import type { AnswerResult } from "@/lib/round";
import type { PublicCard, Scenario, Verdict } from "@/lib/types";
import { AnswerButtons, BottomBar } from "./AnswerButtons";
import { CardView } from "./cards/CardView";
import { FeedbackPanel } from "./FeedbackPanel";
import { ArrowRightIcon, CheckIcon, FlameIcon, ShieldIcon, XIcon } from "./icons";
import { SwipeCard } from "./SwipeCard";

interface PlayScreenProps {
  strings: UiStrings;
  cards: PublicCard[];
  /** Full scenario for each card the server has revealed, else null. */
  revealed: (Scenario | null)[];
  index: number;
  answers: AnswerResult[];
  /** An answer or the finish request is in flight. */
  pending: boolean;
  error: PlayErrorCode | null;
  onAnswer: (choice: Verdict) => void;
  onNext: () => void;
}

const INTERACTIVE = "button, a, input, textarea, select, [contenteditable]";

export function PlayScreen({ strings, cards, revealed, index, answers, pending, error, onAnswer, onNext }: PlayScreenProps) {
  const p = strings.play;
  const card = cards[index];
  const scenario = revealed[index] ?? null;
  const result = answers[index] ?? null;
  const isLast = index === cards.length - 1;
  const points = answers.reduce((sum, a) => sum + a.basePoints + a.bonusPoints, 0);
  const streak = answers.at(-1)?.streak ?? 0;
  const feedbackHeading = useRef<HTMLHeadingElement>(null);

  // Keyboard: ← scam, → legit, Enter or N for the next card.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || pending) return;
      // Keys belong to the link preview while it is open.
      if (document.querySelector("dialog[open]")) return;
      const onControl = event.target instanceof Element && event.target.closest(INTERACTIVE);
      if (!result) {
        if (event.key === "ArrowLeft") onAnswer("scam");
        else if (event.key === "ArrowRight") onAnswer("legit");
        else return;
      } else if (!onControl && (event.key === "Enter" || event.key.toLowerCase() === "n")) {
        onNext();
      } else {
        return;
      }
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [result, pending, onAnswer, onNext]);

  // Move focus to the result so screen readers announce it, without jumping the page.
  useEffect(() => {
    if (result) feedbackHeading.current?.focus({ preventScroll: true });
  }, [result]);

  // Each new card starts at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [index]);

  return (
    <>
      <main className="mx-auto w-full max-w-md px-4 pt-4 pb-32">
        <header className="flex items-center gap-3">
          <ShieldIcon className="size-6 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-slate-800" data-testid="progress">
              {format(p.progress, { current: index + 1, total: cards.length })}
            </h1>
            <div
              role="progressbar"
              aria-label={format(p.progress, { current: index + 1, total: cards.length })}
              aria-valuemin={0}
              aria-valuemax={cards.length}
              aria-valuenow={answers.length}
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${(answers.length / cards.length) * 100}%` }}
              />
            </div>
          </div>
          {streak >= 2 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
              <FlameIcon className="size-3.5" />
              {format(p.streak, { streak })}
            </span>
          ) : null}
          <span className="rounded-full bg-white px-2.5 py-1 text-sm font-bold text-slate-900 tabular-nums shadow-sm ring-1 ring-slate-200">
            {format(p.points, { points })}
          </span>
        </header>

        <m.div
          key={index}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mt-4"
        >
          <SwipeCard
            answer={result?.choice ?? null}
            correct={result?.correct ?? null}
            locked={pending}
            onSwipe={onAnswer}
            labels={{ scam: p.scam, legit: p.legit }}
          >
            <CardView card={card} strings={strings} redFlags={scenario?.redFlags ?? null} />
          </SwipeCard>
        </m.div>

        {error ? (
          <p role="alert" data-testid="play-error" className="mt-3 rounded-xl bg-danger-soft p-3 text-center text-sm font-medium text-danger">
            {strings.errors[error]}
          </p>
        ) : null}

        {result && scenario ? (
          <FeedbackPanel scenario={scenario} result={result} strings={strings} headingRef={feedbackHeading} />
        ) : (
          <p className="mt-3 text-center text-sm text-slate-600" aria-live="polite">
            {pending ? p.checking : p.swipeHint} {pending ? null : <span className="hidden sm:inline">{p.keyHint}</span>}
          </p>
        )}
      </main>

      <BottomBar>
        {result && scenario ? (
          <>
            <div
              aria-hidden
              className={`flex min-w-0 items-center gap-2 ${result.correct ? "text-safe" : "text-danger"}`}
            >
              <span
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white ${result.correct ? "bg-safe" : "bg-danger"}`}
              >
                {result.correct ? <CheckIcon className="size-5" /> : <XIcon className="size-5" />}
              </span>
              <span className="leading-tight">
                <span className="block font-bold">
                  {result.correct ? strings.feedback.correct : strings.feedback.incorrect}
                </span>
                <span className="block text-xs text-slate-600">
                  {scenario.redFlags.length > 0 ? p.seeBelow : p.seeWhy}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={onNext}
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              {pending ? p.checking : isLast ? p.finish : p.next}
              <ArrowRightIcon className="size-5" />
            </button>
          </>
        ) : (
          <AnswerButtons strings={strings} disabled={pending} onAnswer={onAnswer} />
        )}
      </BottomBar>
    </>
  );
}

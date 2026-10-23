"use client";

import { m } from "framer-motion";
import { useEffect, useRef } from "react";
import { format, type UiStrings } from "@/lib/content";
import type { AnswerResult } from "@/lib/round";
import type { Scenario, Verdict } from "@/lib/types";
import { CardView } from "./cards/CardView";
import { FeedbackPanel } from "./FeedbackPanel";
import { ArrowRightIcon, CheckIcon, FlameIcon, ShieldIcon, XIcon } from "./icons";
import { SwipeCard } from "./SwipeCard";

interface PlayScreenProps {
  strings: UiStrings;
  round: Scenario[];
  index: number;
  answers: AnswerResult[];
  onAnswer: (choice: Verdict) => void;
  onNext: () => void;
}

const INTERACTIVE = "button, a, input, textarea, select, [contenteditable]";

export function PlayScreen({ strings, round, index, answers, onAnswer, onNext }: PlayScreenProps) {
  const p = strings.play;
  const scenario = round[index];
  const result = answers[index] ?? null;
  const isLast = index === round.length - 1;
  const points = answers.reduce((sum, a) => sum + a.basePoints + a.bonusPoints, 0);
  const streak = answers.at(-1)?.streak ?? 0;
  const feedbackHeading = useRef<HTMLHeadingElement>(null);

  // Keyboard: ← scam, → legit, Enter or N for the next card.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
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
  }, [result, onAnswer, onNext]);

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
              {format(p.progress, { current: index + 1, total: round.length })}
            </h1>
            <div
              role="progressbar"
              aria-label={format(p.progress, { current: index + 1, total: round.length })}
              aria-valuemin={0}
              aria-valuemax={round.length}
              aria-valuenow={answers.length}
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${(answers.length / round.length) * 100}%` }}
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
          key={scenario.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mt-4"
        >
          <SwipeCard
            answer={result?.choice ?? null}
            correct={result?.correct ?? null}
            onSwipe={onAnswer}
            labels={{ scam: p.scam, legit: p.legit }}
          >
            <CardView scenario={scenario} strings={strings} revealed={result !== null} />
          </SwipeCard>
        </m.div>

        {result ? (
          <FeedbackPanel scenario={scenario} result={result} strings={strings} headingRef={feedbackHeading} />
        ) : (
          <p className="mt-3 text-center text-sm text-slate-600">
            {p.swipeHint} <span className="hidden sm:inline">{p.keyHint}</span>
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {result ? (
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {isLast ? p.finish : p.next}
                <ArrowRightIcon className="size-5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onAnswer("scam")}
                aria-keyshortcuts="ArrowLeft"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-danger bg-white px-4 py-3 text-lg font-semibold text-danger transition-colors hover:bg-danger-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                <XIcon className="size-5" />
                {p.scam}
                <kbd aria-hidden className="hidden text-xs font-normal text-danger/80 sm:inline">
                  ←
                </kbd>
              </button>
              <button
                type="button"
                onClick={() => onAnswer("legit")}
                aria-keyshortcuts="ArrowRight"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-safe bg-white px-4 py-3 text-lg font-semibold text-safe transition-colors hover:bg-safe-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-safe"
              >
                <CheckIcon className="size-5" />
                {p.legit}
                <kbd aria-hidden className="hidden text-xs font-normal text-safe/80 sm:inline">
                  →
                </kbd>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

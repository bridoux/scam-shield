import type { Ref } from "react";
import { format, type UiStrings } from "@/lib/content";
import type { AnswerResult } from "@/lib/round";
import type { Scenario } from "@/lib/types";
import { CheckIcon, XIcon } from "./icons";

interface FeedbackPanelProps {
  scenario: Scenario;
  result: AnswerResult;
  strings: UiStrings;
  /** Focused when feedback appears so screen readers announce the result. */
  headingRef?: Ref<HTMLHeadingElement>;
}

/** Result, red flags (numbered to match the highlights) and the takeaway. */
export function FeedbackPanel({ scenario, result, strings, headingRef }: FeedbackPanelProps) {
  const f = strings.feedback;
  const points = result.basePoints + result.bonusPoints;
  return (
    <section aria-labelledby="feedback-heading" className="mt-4 space-y-3" data-testid="feedback">
      <div
        className={`flex items-start gap-3 rounded-xl p-4 ${result.correct ? "bg-safe-soft text-safe" : "bg-danger-soft text-danger"}`}
      >
        <span
          aria-hidden
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white ${result.correct ? "bg-safe" : "bg-danger"}`}
        >
          {result.correct ? <CheckIcon className="size-5" /> : <XIcon className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="feedback-heading" ref={headingRef} tabIndex={-1} className="text-lg font-bold outline-none">
            {result.correct ? f.correct : f.incorrect}{" "}
            <span className="font-semibold text-slate-900">
              {scenario.verdict === "scam" ? f.wasScam : f.wasLegit}
            </span>
          </h2>
          <p className="mt-0.5 text-sm font-medium text-slate-700">
            {points > 0 ? format(f.pointsEarned, { points: result.basePoints }) : f.noPoints}
            {result.bonusPoints > 0 ? ` · ${format(f.streakBonus, { bonus: result.bonusPoints })}` : ""}
          </p>
        </div>
      </div>

      {scenario.redFlags.length > 0 ? (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-sm font-semibold tracking-wide text-slate-600 uppercase">{f.redFlags}</h3>
          <ol className="mt-3 space-y-3">
            {scenario.redFlags.map((flag, i) => (
              <li key={flag.id} className="flex gap-3">
                <span className="flag-badge mt-0.5 shrink-0" aria-hidden>
                  {i + 1}
                </span>
                <p className="text-[15px] leading-snug text-slate-800">
                  <span className="sr-only">{format(f.redFlag, { number: i + 1 })}: </span>
                  <strong className="font-semibold text-slate-900">{flag.label}.</strong> {flag.explanation}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {scenario.legitReason ? (
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h3 className="text-sm font-semibold tracking-wide text-slate-600 uppercase">{f.whySafe}</h3>
          <p className="mt-2 text-[15px] leading-snug text-slate-800">{scenario.legitReason}</p>
        </div>
      ) : null}

      <div className="rounded-xl border-l-4 border-accent bg-accent-soft p-4">
        <h3 className="text-sm font-semibold tracking-wide text-accent-strong uppercase">{f.tip}</h3>
        <p className="mt-1 text-[15px] leading-snug font-medium text-slate-900">{scenario.tip}</p>
      </div>
    </section>
  );
}

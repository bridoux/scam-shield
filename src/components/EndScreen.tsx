import { format, scamTypeLabel, type UiStrings } from "@/lib/content";
import type { PlayerProgress } from "@/lib/play/types";
import type { AnswerResult, RoundSummary } from "@/lib/round";
import type { Scenario } from "@/lib/types";
import { ProgressCard } from "./ProgressCard";
import { ArrowRightIcon, CheckIcon, ChannelIcon, ShieldIcon, XIcon } from "./icons";

interface EndScreenProps {
  strings: UiStrings;
  summary: RoundSummary;
  round: Scenario[];
  answers: AnswerResult[];
  /** Where the result went: the training record, practice, or nowhere (demo). */
  saved: "record" | "practice" | null;
  playAgainLabel: string;
  /** Level, streak and league after this round (signed-in play only). */
  progress?: PlayerProgress | null;
  onPlayAgain: () => void;
}

function verdictLine(strings: UiStrings, accuracy: number): string {
  const v = strings.end.verdicts;
  if (accuracy >= 90) return v.great;
  if (accuracy >= 70) return v.good;
  return v.learning;
}

export function EndScreen({ strings, summary, round, answers, saved, playAgainLabel, progress, onPlayAgain }: EndScreenProps) {
  const e = strings.end;
  const answerById = new Map(answers.map((a) => [a.scenarioId, a]));

  return (
    <main className="mx-auto w-full max-w-md px-5 pt-8 pb-10" data-testid="end-screen">
      <div className="flex items-center gap-2 text-accent">
        <ShieldIcon className="size-6" />
        <span className="font-bold text-slate-900">{strings.appName}</span>
      </div>

      <h1 className="mt-8 text-sm font-semibold tracking-wide text-accent uppercase">{e.title}</h1>
      <p className="mt-1 text-[2rem] leading-tight font-bold tracking-tight text-slate-900">
        {format(e.scoreLine, { correct: summary.correct, total: summary.total })}
      </p>
      <p className="mt-2 text-slate-700">{verdictLine(strings, summary.accuracy)}</p>
      {saved ? (
        <p
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${saved === "record" ? "bg-safe-soft text-safe" : "bg-slate-200 text-slate-700"}`}
          data-testid="saved-note"
        >
          {saved === "record" ? <CheckIcon className="size-4" /> : null}
          {saved === "record" ? e.savedRecord : e.savedPractice}
        </p>
      ) : null}

      <dl className="mt-6 grid grid-cols-3 gap-2">
        <Stat label={e.accuracy} value={`${summary.accuracy}%`} />
        <Stat label={e.points} value={String(summary.points)} />
        <Stat label={e.bestStreak} value={String(summary.bestStreak)} />
      </dl>
      <p className="mt-2 text-center text-xs text-slate-600">
        {e.points}: {format(e.pointsDetail, { base: summary.basePoints, bonus: summary.bonusPoints })}
      </p>

      {progress ? (
        <div className="mt-6">
          <ProgressCard strings={strings} progress={progress} earned={saved === "record" ? summary.points : undefined} />
          {saved === "practice" ? <p className="mt-2 text-xs text-slate-600">{strings.progress.practiceNoProgress}</p> : null}
        </div>
      ) : null}

      <section className="mt-8" aria-labelledby="missed-heading">
        <h2 id="missed-heading" className="text-lg font-semibold text-slate-900">
          {e.missedHeading}
        </h2>
        {summary.missedScams.length === 0 ? (
          <p className="mt-2 rounded-xl bg-safe-soft p-4 text-[15px] font-medium text-safe">{e.missedNone}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            {summary.missedScams.map((m) => (
              <li key={m.scamType} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="font-medium text-slate-900">{scamTypeLabel(strings, m.scamType)}</span>
                <span className="shrink-0 rounded-full bg-danger-soft px-2.5 py-0.5 text-sm font-semibold text-danger">
                  {format(e.missedCount, { count: m.count })}
                </span>
              </li>
            ))}
          </ul>
        )}
        {summary.falseAlarms > 0 ? (
          <div className="mt-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="font-medium text-slate-900">{format(e.falseAlarms, { count: summary.falseAlarms })}</p>
            <p className="mt-1 text-sm text-slate-600">{e.falseAlarmsNote}</p>
          </div>
        ) : null}
      </section>

      <section className="mt-8" aria-labelledby="recap-heading">
        <h2 id="recap-heading" className="text-lg font-semibold text-slate-900">
          {e.recapHeading}
        </h2>
        <ol className="mt-3 space-y-2">
          {round.map((s) => {
            const a = answerById.get(s.id);
            const ok = a?.correct ?? false;
            return (
              <li key={s.id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200">
                <ChannelIcon channel={s.channel} className="size-5 shrink-0 text-slate-500" />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{s.subject ?? s.sender.name}</span>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${ok ? "text-safe" : "text-danger"}`}
                >
                  {ok ? <CheckIcon className="size-4" /> : <XIcon className="size-4" />}
                  {ok ? e.recapCorrect : e.recapWrong}
                  <span className="text-slate-500">
                    · {s.verdict === "scam" ? strings.play.scam : strings.play.legit}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <button
        type="button"
        onClick={onPlayAgain}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {playAgainLabel}
        <ArrowRightIcon className="size-5" />
      </button>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-2 py-3 text-center shadow-sm ring-1 ring-slate-200">
      <dt className="text-xs font-medium text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">{value}</dd>
    </div>
  );
}

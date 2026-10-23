import type { ReactNode } from "react";
import type { UiStrings } from "@/lib/content";
import type { PlayErrorCode } from "@/lib/play/types";
import { ArrowRightIcon, ShieldIcon } from "./icons";

interface StartScreenProps {
  strings: UiStrings;
  /** Line under the button: demo notice, or whether this round counts. */
  note: string;
  cta?: string;
  error: PlayErrorCode | null;
  /** Shown at the right of the top bar, e.g. the account menu. */
  accessory?: ReactNode;
  onStart: () => void;
  /** Called on hover, touch or key press over the start button, to preload the round. */
  onIntent?: () => void;
}

export function StartScreen({ strings, note, cta, error, accessory, onStart, onIntent }: StartScreenProps) {
  const s = strings.start;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-8 pb-8">
      <div className="flex items-center gap-2 text-accent">
        <ShieldIcon className="size-7" />
        <span className="text-lg font-bold tracking-tight text-slate-900">{strings.appName}</span>
        {accessory ? <div className="ml-auto">{accessory}</div> : null}
      </div>

      <div className="mt-10">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">{s.eyebrow}</p>
        <h1 className="mt-2 text-[2rem] leading-tight font-bold tracking-tight text-slate-900">{s.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-700">{s.intro}</p>
      </div>

      <ol className="mt-8 space-y-3">
        {s.steps.map((step, i) => (
          <li key={i} className="flex gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <span
              aria-hidden
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent"
            >
              {i + 1}
            </span>
            <span className="text-[15px] leading-snug text-slate-800">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-auto pt-10">
        <button
          type="button"
          onClick={onStart}
          onPointerEnter={onIntent}
          onPointerDown={onIntent}
          onKeyDown={onIntent}
          autoFocus
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {cta ?? s.cta}
          <ArrowRightIcon className="size-5" />
        </button>
        {error ? (
          <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-center text-sm font-medium text-danger">
            {strings.errors[error]}
          </p>
        ) : null}
        <p className="mt-3 text-center text-sm text-slate-600" data-testid="start-note">
          {s.duration} · {note}
        </p>
        <p className="mt-1 hidden text-center text-xs text-slate-500 sm:block">{s.keyboardHint}</p>
      </div>
    </main>
  );
}

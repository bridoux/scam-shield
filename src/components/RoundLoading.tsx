import type { UiStrings } from "@/lib/content";
import { AnswerButtons, BottomBar } from "./AnswerButtons";
import { ShieldIcon } from "./icons";

/**
 * Shown between "Start" and the first card. The answer controls are visible but
 * disabled, so early key presses or taps are clearly not accepted yet.
 */
export function RoundLoading({ strings }: { strings: UiStrings }) {
  return (
    <>
      <main className="mx-auto w-full max-w-md px-4 pt-4 pb-32" aria-busy="true" data-testid="round-loading">
        <header className="flex items-center gap-3">
          <ShieldIcon className="size-6 shrink-0 text-accent" />
          <h1 className="text-sm font-semibold text-slate-800" role="status">
            {strings.play.loadingRound}
          </h1>
        </header>
        <div className="mt-4 h-80 animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 motion-reduce:animate-none" />
      </main>
      <BottomBar>
        <AnswerButtons strings={strings} disabled />
      </BottomBar>
    </>
  );
}

"use client";

import type { ReactNode } from "react";
import type { UiStrings } from "@/lib/content";
import type { Verdict } from "@/lib/types";
import { CheckIcon, XIcon } from "./icons";

interface AnswerButtonsProps {
  strings: UiStrings;
  /** Disabled while the round loads or an answer is being checked. */
  disabled: boolean;
  onAnswer?: (choice: Verdict) => void;
}

/** The Scam / Legit buttons pinned to the bottom of the play screen. */
export function AnswerButtons({ strings, disabled, onAnswer }: AnswerButtonsProps) {
  const p = strings.play;
  return (
    <>
      <button
        type="button"
        onClick={() => onAnswer?.("scam")}
        disabled={disabled}
        aria-keyshortcuts="ArrowLeft"
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-danger bg-white px-4 py-3 text-lg font-semibold text-danger transition-colors hover:bg-danger-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
      >
        <XIcon className="size-5" />
        {p.scam}
        <kbd aria-hidden className="hidden text-xs font-normal text-danger/80 sm:inline">
          ←
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => onAnswer?.("legit")}
        disabled={disabled}
        aria-keyshortcuts="ArrowRight"
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-safe bg-white px-4 py-3 text-lg font-semibold text-safe transition-colors hover:bg-safe-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-safe disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
      >
        <CheckIcon className="size-5" />
        {p.legit}
        <kbd aria-hidden className="hidden text-xs font-normal text-safe/80 sm:inline">
          →
        </kbd>
      </button>
    </>
  );
}

/** Fixed bottom bar shared by the loading and play screens. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-md gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}

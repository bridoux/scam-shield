"use client";

import { useActionState } from "react";
import { savePlayDays, type PlayDaysState } from "@/app/actions/company";
import { SubmitButton } from "@/components/ui/form";
import { Notice } from "@/components/ui/Shell";
import type { UiStrings } from "@/lib/content";

interface PlayDaysFormProps {
  strings: UiStrings;
  /** ISO weekdays, 1 = Monday. */
  playDays: number[];
  canEdit: boolean;
}

/** Weekday toggles for the owner; a read-only list for everyone else. */
export function PlayDaysForm({ strings, playDays, canEdit }: PlayDaysFormProps) {
  const t = strings.team;
  const [state, action] = useActionState<PlayDaysState, FormData>(savePlayDays, { status: "idle" });

  return (
    <form action={action} className="mt-3" data-testid="play-days">
      <fieldset disabled={!canEdit}>
        <legend className="sr-only">{t.playDaysHeading}</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {t.weekdays.map((short, i) => {
            const day = i + 1;
            return (
              <label key={day} className="relative">
                <input
                  type="checkbox"
                  name="day"
                  value={day}
                  defaultChecked={playDays.includes(day)}
                  aria-label={t.weekdaysLong[i]}
                  className="peer sr-only"
                />
                <span className="flex h-10 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold text-slate-600 ring-1 ring-slate-300 peer-checked:bg-accent peer-checked:text-white peer-checked:ring-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-default">
                  {short}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {canEdit ? (
        <div className="mt-3 space-y-2">
          {state.status === "error" ? <Notice tone="error">{t[state.error]}</Notice> : null}
          {state.status === "saved" ? <Notice tone="success">{t.saved}</Notice> : null}
          <SubmitButton pendingLabel={t.saving}>{t.savePlayDays}</SubmitButton>
        </div>
      ) : null}
    </form>
  );
}

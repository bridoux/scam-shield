"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { MemberActionState } from "@/app/actions/members";
import { Notice } from "@/components/ui/Shell";
import type { UiStrings } from "@/lib/content";

type Action = (state: MemberActionState, formData: FormData) => Promise<MemberActionState>;

const IDLE: MemberActionState = { status: "idle" };

const VARIANTS = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  danger: "bg-danger text-white hover:opacity-90",
  quiet: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

export const BUTTON =
  "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

export function buttonClass(variant: ButtonVariant): string {
  return `${BUTTON} ${VARIANTS[variant]}`;
}

/** A compact submit button that shows `pendingLabel` while its form's action runs. */
export function SmallSubmit({ children, pendingLabel, variant = "primary" }: { children: ReactNode; pendingLabel: string; variant?: ButtonVariant }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant)}>
      {pending ? pendingLabel : children}
    </button>
  );
}

interface ActionFormProps {
  action: Action;
  strings: UiStrings;
  children: ReactNode;
  className?: string;
  testId?: string;
}

/** A form bound to one member/team action, showing that action's error under it. */
export function ActionForm({ action, strings, children, className, testId }: ActionFormProps) {
  const [state, formAction] = useActionState<MemberActionState, FormData>(action, IDLE);
  return (
    <form action={formAction} className={className} data-testid={testId}>
      {children}
      {state.status === "error" ? (
        <div className="mt-2">
          <Notice tone="error">{strings.team[state.error]}</Notice>
        </div>
      ) : null}
    </form>
  );
}

export const SELECT =
  "block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-accent focus:outline-2 focus:outline-accent/30";

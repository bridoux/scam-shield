"use client";

import { useActionState } from "react";
import { sendMagicLink, type SignInState } from "@/app/actions/auth";
import { SubmitButton, TextField } from "@/components/ui/form";
import { Notice } from "@/components/ui/Shell";
import { format, type UiStrings } from "@/lib/content";

interface SignInFormProps {
  strings: UiStrings;
  next: string;
  linkFailed: boolean;
}

export function SignInForm({ strings, next, linkFailed }: SignInFormProps) {
  const a = strings.auth;
  const [state, action] = useActionState<SignInState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="mt-8 space-y-3" data-testid="sign-in-sent">
        <h2 className="text-xl font-bold text-slate-900">{a.sentTitle}</h2>
        <p className="text-slate-700">{format(a.sent, { email: state.email })}</p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      {linkFailed && state.status === "idle" ? <Notice tone="error">{a.linkFailed}</Notice> : null}
      {state.status === "error" ? <Notice tone="error">{a[state.error]}</Notice> : null}
      <input type="hidden" name="next" value={next} />
      <TextField label={a.email} name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
      <SubmitButton pendingLabel={a.sending}>{a.submit}</SubmitButton>
    </form>
  );
}

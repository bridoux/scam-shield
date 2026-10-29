"use client";

import { useActionState } from "react";
import { acceptInvite, type FormState } from "@/app/actions/company";
import { SubmitButton, TextField } from "@/components/ui/form";
import { Notice } from "@/components/ui/Shell";
import { format, type UiStrings } from "@/lib/content";

interface JoinFormProps {
  strings: UiStrings;
  token: string;
  company: string;
  defaultName: string;
}

export function JoinForm({ strings, token, company, defaultName }: JoinFormProps) {
  const j = strings.join;
  const [state, action] = useActionState<FormState, FormData>(acceptInvite, { status: "idle" });
  return (
    <form action={action} className="mt-8 space-y-4">
      {state.status === "error" ? (
        <Notice tone="error">{j[state.error as "invalid" | "alreadyMember" | "deactivated" | "full" | "failed"] ?? j.failed}</Notice>
      ) : null}
      <input type="hidden" name="token" value={token} />
      <TextField label={j.yourName} name="displayName" required maxLength={80} autoComplete="name" defaultValue={defaultName} />
      <SubmitButton pendingLabel={j.joining}>{format(j.submit, { company })}</SubmitButton>
    </form>
  );
}

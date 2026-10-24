"use client";

import { useActionState } from "react";
import { createCompany, type FormState } from "@/app/actions/company";
import { SelectField, SubmitButton, TextField } from "@/components/ui/form";
import { Notice } from "@/components/ui/Shell";
import type { UiStrings } from "@/lib/content";

/** Adds the browser's time zone, so "today's round" follows the company's working day. */
function withTimeZone(formData: FormData): FormData {
  formData.set("timeZone", Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
  return formData;
}

export function OnboardingForm({ strings, defaultName }: { strings: UiStrings; defaultName: string }) {
  const o = strings.onboarding;
  const [state, action] = useActionState<FormState, FormData>(
    (prev, formData) => createCompany(prev, withTimeZone(formData)),
    { status: "idle" },
  );
  const industries = Object.entries(o.industries).map(([value, label]) => ({ value, label }));

  return (
    <form action={action} className="mt-8 space-y-4">
      {state.status === "error" ? (
        <Notice tone="error">{o[state.error as "invalid" | "alreadyMember" | "failed"] ?? o.failed}</Notice>
      ) : null}
      <TextField label={o.company} name="company" required minLength={2} maxLength={120} autoComplete="organization" />
      <SelectField label={o.industry} name="industry" options={industries} defaultValue="general" />
      <TextField label={o.team} name="team" required maxLength={80} placeholder={o.teamPlaceholder} />
      <TextField label={o.yourName} name="displayName" required maxLength={80} autoComplete="name" defaultValue={defaultName} />
      <SubmitButton pendingLabel={o.creating}>{o.submit}</SubmitButton>
    </form>
  );
}

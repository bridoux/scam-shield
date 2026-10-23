"use client";

import { useActionState, useState } from "react";
import { createInvite, type FormState } from "@/app/actions/company";
import { SelectField, SubmitButton } from "@/components/ui/form";
import { Notice } from "@/components/ui/Shell";
import type { UiStrings } from "@/lib/content";

interface CreateInviteFormProps {
  strings: UiStrings;
  teams: { id: string; name: string }[];
}

export function CreateInviteForm({ strings, teams }: CreateInviteFormProps) {
  const t = strings.team;
  const [state, action] = useActionState<FormState, FormData>(createInvite, { status: "idle" });
  return (
    <form action={action} className="mt-4 space-y-3">
      {state.status === "error" ? <Notice tone="error">{t[state.error as "ownersOnly" | "failed"] ?? t.failed}</Notice> : null}
      {teams.length > 1 ? (
        <SelectField label={t.inviteTeam} name="teamId" options={teams.map((x) => ({ value: x.id, label: x.name }))} />
      ) : (
        <input type="hidden" name="teamId" value={teams[0]?.id ?? ""} />
      )}
      <SubmitButton pendingLabel={t.creating}>{t.createInvite}</SubmitButton>
    </form>
  );
}

export function CopyLinkButton({ url, strings }: { url: string; strings: UiStrings }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context): the link is selectable text right next to the button.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span aria-live="polite">{copied ? strings.team.copied : strings.team.copy}</span>
    </button>
  );
}

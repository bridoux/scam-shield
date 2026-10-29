"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteCompany, deleteMyAccount, type DeleteState } from "@/app/actions/account";
import { Notice } from "@/components/ui/Shell";
import type { UiStrings } from "@/lib/content";

type Action = (state: DeleteState, formData: FormData) => Promise<DeleteState>;

const IDLE: DeleteState = { status: "idle" };

function DangerSubmit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 w-full rounded-xl bg-danger px-6 py-3 font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

interface ConfirmDeleteProps {
  strings: UiStrings;
  action: Action;
  inputLabel: string;
  inputType: "email" | "text";
  buttonLabel: string;
  testId: string;
}

/** A delete form that only submits once the person has typed the exact confirmation text. */
function ConfirmDelete({ strings, action, inputLabel, inputType, buttonLabel, testId }: ConfirmDeleteProps) {
  const a = strings.account;
  const [state, formAction] = useActionState<DeleteState, FormData>(action, IDLE);
  return (
    <form action={formAction} className="mt-3" data-testid={testId}>
      <label htmlFor={`${testId}-confirm`} className="text-sm font-semibold text-slate-800">
        {inputLabel}
      </label>
      <input
        id={`${testId}-confirm`}
        name="confirm"
        type={inputType}
        required
        autoComplete="off"
        className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 focus:border-danger focus:outline-2 focus:outline-danger/30"
      />
      {state.status === "error" ? (
        <div className="mt-2">
          <Notice tone="error">{a[state.error]}</Notice>
        </div>
      ) : null}
      <DangerSubmit label={buttonLabel} pendingLabel={a.deleting} />
    </form>
  );
}

export function DeleteAccountForm({ strings }: { strings: UiStrings }) {
  const a = strings.account;
  return (
    <ConfirmDelete
      strings={strings}
      action={deleteMyAccount}
      inputLabel={a.deleteConfirmLabel}
      inputType="email"
      buttonLabel={a.deleteButton}
      testId="delete-account"
    />
  );
}

export function DeleteCompanyForm({ strings }: { strings: UiStrings }) {
  const a = strings.account;
  return (
    <ConfirmDelete
      strings={strings}
      action={deleteCompany}
      inputLabel={a.companyConfirmLabel}
      inputType="text"
      buttonLabel={a.companyButton}
      testId="delete-company"
    />
  );
}

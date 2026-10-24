"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRightIcon } from "../icons";

const CONTROL =
  "mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-accent focus:outline-2 focus:outline-accent/30";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
}

export function TextField({ label, name, id, ...input }: TextFieldProps) {
  const fieldId = id ?? `field-${name}`;
  return (
    <div>
      <label htmlFor={fieldId} className="text-sm font-semibold text-slate-800">
        {label}
      </label>
      <input id={fieldId} name={name} className={CONTROL} {...input} />
    </div>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: { value: string; label: string }[];
}

export function SelectField({ label, name, id, options, ...select }: SelectFieldProps) {
  const fieldId = id ?? `field-${name}`;
  return (
    <div>
      <label htmlFor={fieldId} className="text-sm font-semibold text-slate-800">
        {label}
      </label>
      <select id={fieldId} name={name} className={CONTROL} {...select}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Primary submit button; shows `pendingLabel` while its form's action runs. */
export function SubmitButton({ children, pendingLabel }: { children: ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
      {pending ? null : <ArrowRightIcon className="size-5" />}
    </button>
  );
}

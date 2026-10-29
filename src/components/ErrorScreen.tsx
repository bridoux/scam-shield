"use client";

import { useEffect } from "react";
import { messageOf, reportBrowserError } from "@/lib/errors/browser";
import uiEnUS from "@/data/ui.en-US.json";
import { ShieldIcon } from "./icons";

interface ErrorScreenProps {
  /** Whatever was thrown: an Error from the server, or any value from a client component. */
  error: unknown;
  /** Fetches and renders the failed segment again. */
  onRetry: () => void;
}

function fromServer(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error;
}

/** What players see when a page fails, instead of Next.js's bare default (error.tsx, global-error.tsx). */
export function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  const s = uiEnUS.errorPage;

  useEffect(() => {
    // A digest means the error happened on the server, which has already reported it.
    if (!fromServer(error)) reportBrowserError("render", messageOf(error));
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-8 pb-10">
      <div className="flex items-center gap-2 text-accent">
        <ShieldIcon className="size-7" />
        <span className="text-lg font-bold tracking-tight text-slate-900">{uiEnUS.appName}</span>
      </div>
      <section role="alert" className="mt-12">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{s.heading}</h1>
        <p className="mt-3 text-base text-slate-600">{s.body}</p>
      </section>
      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {s.retry}
        </button>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full page load, not a client navigation: the app's state may be what broke. */}
        <a
          href="/"
          className="flex w-full items-center justify-center rounded-xl px-6 py-3 text-base font-semibold text-accent-strong ring-1 ring-slate-300 hover:bg-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {s.home}
        </a>
      </div>
    </main>
  );
}

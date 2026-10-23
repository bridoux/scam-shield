"use client";

import { useEffect, useRef } from "react";
import type { UiStrings } from "@/lib/content";
import { linkHost } from "@/lib/highlight";
import type { CardLink } from "@/lib/types";

interface LinkPreviewProps {
  link: CardLink | null;
  strings: UiStrings;
  onClose: () => void;
}

/** Shows where a link really goes, the way a long-press preview does on a phone. Never navigates. */
export function LinkPreview({ link, strings, onClose }: LinkPreviewProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const l = strings.links;

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (link && !el.open) el.showModal();
    if (!link && el.open) el.close();
  }, [link]);

  const host = link ? linkHost(link.url) : "";

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      // Taps inside the sheet must not start a swipe on the card underneath.
      onPointerDownCapture={(e) => e.stopPropagation()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // backdrop tap
      }}
      aria-labelledby="link-preview-title"
      data-testid="link-preview"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50"
    >
      {link ? (
        <div className="p-5">
          <h2 id="link-preview-title" className="text-sm font-semibold tracking-wide text-slate-600 uppercase">
            {l.previewTitle}
          </h2>
          <p className="mt-3 text-xs font-medium text-slate-600">{l.opensSite}</p>
          <p className="mt-0.5 text-xl leading-tight font-bold break-all" data-testid="link-preview-host">
            {host || link.url}
          </p>
          <p className="mt-3 text-xs font-medium text-slate-600">{l.fullAddress}</p>
          <p className="mt-0.5 rounded-lg bg-slate-100 px-3 py-2 font-mono text-[13px] leading-snug break-all text-slate-800">
            {link.url}
          </p>
          <p className="mt-4 text-sm leading-snug text-slate-700">{l.habit}</p>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="mt-5 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {l.close}
          </button>
        </div>
      ) : null}
    </dialog>
  );
}

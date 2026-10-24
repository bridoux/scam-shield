import type { ReactNode } from "react";
import { segmentText, type NumberedFlag, type Segment } from "@/lib/highlight";
import type { CardLink } from "@/lib/types";

interface HighlightProps {
  text: string;
  /** Flags to mark in this text. Pass an empty array to render plain text. */
  flags: readonly NumberedFlag[];
  /** Links in this text; each opens a preview of its real destination. */
  links?: readonly CardLink[];
  onLink?: (link: CardLink) => void;
  /** Screen-reader prefix, e.g. "Red flag {number}". */
  srLabel: (flag: NumberedFlag) => string;
  /** Accessible name for a link button, e.g. "Preview link: {text}". */
  linkLabel?: (link: CardLink) => string;
}

/** Renders text with red-flag targets wrapped in numbered <mark> elements and links as preview buttons. */
export function Highlight({ text, flags, links = [], onLink, srLabel, linkLabel }: HighlightProps) {
  if (flags.length === 0 && links.length === 0) return <>{text}</>;
  return (
    <>
      {segmentText(text, flags, links).map((segment, i) => {
        const content = segment.flag ? <Flagged segment={segment} srLabel={srLabel} /> : segment.text;
        if (segment.link && onLink) {
          const link = segment.link;
          return (
            <LinkButton key={i} label={linkLabel?.(link)} onClick={() => onLink(link)}>
              {content}
            </LinkButton>
          );
        }
        return segment.flag ? <Flagged key={i} segment={segment} srLabel={srLabel} /> : <span key={i}>{segment.text}</span>;
      })}
    </>
  );
}

function Flagged({ segment, srLabel }: { segment: Segment; srLabel: (flag: NumberedFlag) => string }) {
  const flag = segment.flag!;
  return (
    <mark
      data-flag={flag.id}
      className="rounded-sm bg-flag px-0.5 text-inherit underline decoration-flag-ring decoration-2 underline-offset-2 [box-decoration-break:clone]"
    >
      <span className="sr-only">{srLabel(flag)}: </span>
      {leadingText(segment.text)}
      {/* Keep the badge on the same line as the last word. */}
      <span className="whitespace-nowrap">
        {lastWord(segment.text)}
        <span className="flag-badge ml-0.5" aria-hidden>
          {flag.number}
        </span>
      </span>
    </mark>
  );
}

function LinkButton({ children, label, onClick }: { children: ReactNode; label?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Stop the card's drag gesture from starting on a link tap.
      onPointerDownCapture={(e) => e.stopPropagation()}
      aria-label={label}
      aria-haspopup="dialog"
      data-testid="card-link"
      className="inline cursor-pointer rounded-sm text-left font-medium break-all text-link underline decoration-link/60 underline-offset-2 hover:decoration-link focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-link"
    >
      {children}
    </button>
  );
}

function splitAt(text: string): number {
  return text.trimEnd().search(/\S+$/);
}

function leadingText(text: string): string {
  return text.slice(0, splitAt(text));
}

function lastWord(text: string): string {
  return text.slice(splitAt(text));
}

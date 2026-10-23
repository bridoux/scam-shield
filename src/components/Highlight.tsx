import { segmentText, type NumberedFlag } from "@/lib/highlight";

interface HighlightProps {
  text: string;
  /** Flags to mark in this text. Pass an empty array to render plain text. */
  flags: readonly NumberedFlag[];
  /** Screen-reader prefix, e.g. "Red flag {number}". */
  srLabel: (flag: NumberedFlag) => string;
}

/** Renders text with red-flag targets wrapped in numbered <mark> elements. */
export function Highlight({ text, flags, srLabel }: HighlightProps) {
  if (flags.length === 0) return <>{text}</>;
  return (
    <>
      {segmentText(text, flags).map((segment, i) =>
        segment.flag ? (
          <mark
            key={i}
            data-flag={segment.flag.id}
            className="rounded-sm bg-flag px-0.5 text-inherit underline decoration-flag-ring decoration-2 underline-offset-2 [box-decoration-break:clone]"
          >
            <span className="sr-only">{srLabel(segment.flag)}: </span>
            {leadingText(segment.text)}
            {/* Keep the badge on the same line as the last word. */}
            <span className="whitespace-nowrap">
              {lastWord(segment.text)}
              <span className="flag-badge ml-0.5" aria-hidden>
                {segment.flag.number}
              </span>
            </span>
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </>
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

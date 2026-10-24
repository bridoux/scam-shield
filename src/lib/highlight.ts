import type { CardLink, PublicCard, RedFlag } from "./types";

export type CardField = "senderName" | "senderAddress" | "subject" | "body";

/** Search order: a flag is highlighted in the first field that contains its target. */
export const CARD_FIELDS: readonly CardField[] = ["senderName", "senderAddress", "subject", "body"];

export interface NumberedFlag extends RedFlag {
  /** 1-based position in the scenario's redFlags, shown as a badge. */
  number: number;
}

export function fieldText(card: PublicCard, field: CardField): string {
  switch (field) {
    case "senderName":
      return card.sender.name;
    case "senderAddress":
      return card.sender.address;
    case "subject":
      return card.subject ?? "";
    case "body":
      return card.body;
  }
}

/** Assigns each red flag to the first card field that contains its target. */
export function flagsByField(card: PublicCard, redFlags: readonly RedFlag[]): Record<CardField, NumberedFlag[]> {
  const result: Record<CardField, NumberedFlag[]> = {
    senderName: [],
    senderAddress: [],
    subject: [],
    body: [],
  };
  redFlags.forEach((flag, i) => {
    const field = CARD_FIELDS.find((f) => fieldText(card, f).includes(flag.target));
    if (field) result[field].push({ ...flag, number: i + 1 });
  });
  return result;
}

export interface Segment {
  text: string;
  flag?: NumberedFlag;
  link?: CardLink;
}

interface Range {
  start: number;
  end: number;
  flag?: NumberedFlag;
  link?: CardLink;
}

/**
 * Splits text into plain, flagged and link segments (first occurrence of each target).
 * A link whose text is exactly a flag's target becomes one segment carrying both.
 * Anything overlapping an earlier range is skipped rather than garbling the text.
 */
export function segmentText(text: string, flags: readonly NumberedFlag[], links: readonly CardLink[] = []): Segment[] {
  const flagRanges: Range[] = flags
    .map((flag) => ({ flag, start: text.indexOf(flag.target), end: 0 }))
    .filter((r) => r.start >= 0 && r.flag.target.length > 0)
    .map((r) => ({ ...r, end: r.start + r.flag.target.length }));

  const linkRanges: Range[] = [];
  for (const link of links) {
    const start = text.indexOf(link.text);
    if (start < 0 || link.text.length === 0) continue;
    const end = start + link.text.length;
    const same = flagRanges.find((r) => r.start === start && r.end === end);
    if (same) same.link = link;
    else linkRanges.push({ start, end, link });
  }

  const ranges = [...flagRanges, ...linkRanges].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const { start, end, flag, link } of ranges) {
    if (start < cursor) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: text.slice(start, end), ...(flag ? { flag } : {}), ...(link ? { link } : {}) });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

/** The host a URL really points to, e.g. "app-docs.example". Empty if it can't be parsed. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

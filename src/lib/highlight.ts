import type { RedFlag, Scenario } from "./types";

export type CardField = "senderName" | "senderAddress" | "subject" | "body";

/** Search order: a flag is highlighted in the first field that contains its target. */
export const CARD_FIELDS: readonly CardField[] = ["senderName", "senderAddress", "subject", "body"];

export interface NumberedFlag extends RedFlag {
  /** 1-based position in the scenario's redFlags, shown as a badge. */
  number: number;
}

export function fieldText(scenario: Scenario, field: CardField): string {
  switch (field) {
    case "senderName":
      return scenario.sender.name;
    case "senderAddress":
      return scenario.sender.address;
    case "subject":
      return scenario.subject ?? "";
    case "body":
      return scenario.body;
  }
}

/** Assigns each red flag to the first card field that contains its target. */
export function flagsByField(scenario: Scenario): Record<CardField, NumberedFlag[]> {
  const result: Record<CardField, NumberedFlag[]> = {
    senderName: [],
    senderAddress: [],
    subject: [],
    body: [],
  };
  scenario.redFlags.forEach((flag, i) => {
    const field = CARD_FIELDS.find((f) => fieldText(scenario, f).includes(flag.target));
    if (field) result[field].push({ ...flag, number: i + 1 });
  });
  return result;
}

export interface Segment {
  text: string;
  flag?: NumberedFlag;
}

/** Splits text into plain and flagged segments (first occurrence of each target). */
export function segmentText(text: string, flags: readonly NumberedFlag[]): Segment[] {
  const ranges = flags
    .map((flag) => ({ flag, start: text.indexOf(flag.target) }))
    .filter((r) => r.start >= 0 && r.flag.target.length > 0)
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const { flag, start } of ranges) {
    if (start < cursor) continue; // overlapping target; skip rather than garble the text
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: flag.target, flag });
    cursor = start + flag.target.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { format, scamTypeLabel, type UiStrings } from "../content";
import { percent, type EmployeeRecord, type RecordStatus, type TrainingRecord } from "./record";

/** US Letter, in points. */
const PAGE: [number, number] = [612, 792];
const MARGIN = 40;
const BOTTOM = 56;
const WIDTH = PAGE[0] - 2 * MARGIN;
const ROW_HEIGHT = 28;

const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.35, 0.4, 0.47);
const RULE = rgb(0.85, 0.87, 0.9);
const ACCENT = rgb(0.15, 0.28, 0.72);
const STATUS_COLOR: Record<RecordStatus, RGB> = {
  on_track: rgb(0.06, 0.48, 0.26),
  behind: rgb(0.71, 0.14, 0.09),
  new: MUTED,
};

/** Employee table columns; widths add up to WIDTH. */
const COLUMNS = [
  { key: "colEmployee", width: 164 },
  { key: "colTeam", width: 76 },
  { key: "colJoined", width: 62 },
  { key: "colDays", width: 82 },
  { key: "colCompletion", width: 54 },
  { key: "colAccuracy", width: 50 },
  { key: "colStatus", width: 44 },
] as const;

export interface RecordPdfInput {
  record: TrainingRecord;
  companyName: string;
  timeZone: string;
  generatedAt: Date;
  strings: UiStrings;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

/**
 * Standard PDF fonts only cover Windows-1252. Accented Latin letters survive; anything else
 * falls back to its base letter or "?" instead of failing the whole export.
 */
function safe(font: PDFFont, text: string): string {
  let out = "";
  for (const ch of text.normalize("NFC")) {
    out += encodable(font, ch) ? ch : encodable(font, stripMarks(ch)) ? stripMarks(ch) : "?";
  }
  return out;
}

function stripMarks(ch: string): string {
  return ch.normalize("NFD").replace(/[̀-ͯ]/g, "") || "?";
}

function encodable(font: PDFFont, ch: string): boolean {
  try {
    font.encodeText(ch);
    return true;
  } catch {
    return false;
  }
}

/** Shortens text with "..." until it fits the width. */
function fit(font: PDFFont, text: string, size: number, width: number): string {
  const clean = safe(font, text);
  if (font.widthOfTextAtSize(clean, size) <= width) return clean;
  let cut = clean;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > width) cut = cut.slice(0, -1);
  return `${cut}...`;
}

/** Splits a paragraph into lines that fit the width. */
function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of safe(font, text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function dayLabel(day: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

class Writer {
  page: PDFPage;
  y: number;

  constructor(
    readonly doc: PDFDocument,
    readonly fonts: Fonts,
    readonly onNewPage: (w: Writer) => void,
  ) {
    this.page = doc.addPage(PAGE);
    this.y = PAGE[1] - MARGIN;
  }

  text(text: string, x: number, opts: { size?: number; bold?: boolean; color?: RGB; width?: number } = {}) {
    const { size = 10, bold = false, color = INK, width } = opts;
    const font = bold ? this.fonts.bold : this.fonts.regular;
    this.page.drawText(width ? fit(font, text, size, width) : safe(font, text), { x, y: this.y, size, font, color });
  }

  rule(color = RULE) {
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: MARGIN + WIDTH, y: this.y }, thickness: 0.75, color });
  }

  /** Starts a new page when fewer than `height` points remain. */
  ensure(height: number) {
    if (this.y - height >= BOTTOM) return;
    this.page = this.doc.addPage(PAGE);
    this.y = PAGE[1] - MARGIN;
    this.onNewPage(this);
  }

  paragraph(text: string, size = 9, color = MUTED) {
    for (const line of wrap(this.fonts.regular, text, size, WIDTH)) {
      this.ensure(size + 4);
      this.text(line, MARGIN, { size, color });
      this.y -= size + 4;
    }
  }

  heading(text: string) {
    this.ensure(40);
    this.y -= 8;
    this.text(text, MARGIN, { size: 12, bold: true });
    this.y -= 6;
    this.rule();
    this.y -= 14;
  }
}

function tableHeader(w: Writer, r: UiStrings["record"]) {
  let x = MARGIN;
  for (const col of COLUMNS) {
    w.text(r[col.key], x, { size: 7.5, bold: true, color: MUTED, width: col.width - 6 });
    x += col.width;
  }
  w.y -= 6;
  w.rule();
  w.y -= 12;
}

function employeeRow(w: Writer, e: EmployeeRecord, strings: UiStrings) {
  const status = strings.dashboard.status[e.status];
  const cells = [
    e.teamName ?? "",
    dayLabel(e.joinedOn),
    `${e.completedDays} / ${e.requiredDays}`,
    e.completion === null ? "-" : `${percent(e.completion)}%`,
    e.accuracy === null ? "-" : `${percent(e.accuracy)}%`,
  ];
  w.text(e.displayName, MARGIN, { size: 9, bold: true, width: COLUMNS[0].width - 6 });
  let x = MARGIN + COLUMNS[0].width;
  cells.forEach((cell, i) => {
    w.text(cell, x, { size: 8.5, width: COLUMNS[i + 1].width - 6 });
    x += COLUMNS[i + 1].width;
  });
  w.text(status, x, { size: 8.5, bold: true, color: STATUS_COLOR[e.status], width: COLUMNS[6].width });
  // Name line, email line, rule: exactly ROW_HEIGHT points in total.
  w.y -= 9;
  w.text(e.email, MARGIN, { size: 7.5, color: MUTED, width: COLUMNS[0].width - 6 });
  w.y -= 9;
  w.rule();
  w.y -= ROW_HEIGHT - 18;
}

export async function renderRecordPdf({ record, companyName, timeZone, generatedAt, strings }: RecordPdfInput): Promise<Uint8Array> {
  const r = strings.record;
  const doc = await PDFDocument.create();
  doc.setTitle(`${r.title} - ${companyName}`);
  doc.setCreator("Scam Shield");
  doc.setProducer("Scam Shield");
  doc.setCreationDate(generatedAt);
  const fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };

  let inTable = false;
  const w = new Writer(doc, fonts, (writer) => {
    writer.text(`${r.title} - ${companyName}`, MARGIN, { size: 9, bold: true, color: MUTED, width: WIDTH });
    writer.y -= 22;
    if (inTable) {
      writer.text(`${r.employeeTable} ${r.continued}`, MARGIN, { size: 10, bold: true });
      writer.y -= 18;
      tableHeader(writer, r);
    }
  });

  // Header
  const generated = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(generatedAt);
  const weekdays = strings.team.weekdays;
  w.text(r.preparedWith, MARGIN, { size: 8, bold: true, color: ACCENT });
  w.y -= 24;
  w.text(r.title, MARGIN, { size: 18, bold: true, width: WIDTH });
  w.y -= 26;
  const facts: [string, string][] = [
    [r.company, companyName],
    [r.period, `${dayLabel(record.period.from)} - ${dayLabel(record.period.to)}`],
    [r.trainingDays, record.playDays.map((d) => weekdays[d - 1]).join(", ")],
    [r.generated, generated],
  ];
  for (const [label, value] of facts) {
    w.text(label, MARGIN, { size: 9, bold: true, color: MUTED });
    w.text(value, MARGIN + 92, { size: 10, width: WIDTH - 92 });
    w.y -= 15;
  }

  // Summary
  const s = record.summary;
  w.heading(r.summary);
  const stats: [string, string][] = [
    [r.employees, String(s.employees)],
    [r.onTrack, String(s.onTrack)],
    [r.behind, String(s.behind)],
    [r.new, String(s.new)],
    [r.avgCompletion, s.avgCompletion === null ? "-" : `${percent(s.avgCompletion)}%`],
    [r.avgAccuracy, s.avgAccuracy === null ? "-" : `${percent(s.avgAccuracy)}%`],
    [r.rounds, String(s.rounds)],
  ];
  const statWidth = WIDTH / 4;
  stats.forEach(([label, value], i) => {
    const col = i % 4;
    if (col === 0 && i > 0) w.y -= 38;
    const x = MARGIN + col * statWidth;
    w.text(value, x, { size: 16, bold: true });
    w.y -= 13;
    w.text(label, x, { size: 8, color: MUTED, width: statWidth - 8 });
    w.y += 13;
  });
  w.y -= 34;

  // Employee table
  w.heading(r.employeeTable);
  tableHeader(w, r);
  inTable = true;
  for (const e of record.employees) {
    w.ensure(ROW_HEIGHT);
    employeeRow(w, e, strings);
  }
  inTable = false;

  // Topics, method, attestation
  w.heading(r.topics);
  if (record.topics.length === 0) w.paragraph(r.noTopics);
  // Two columns, most-practised first: this section documents what the training covered.
  const covered = [...record.topics].sort((a, b) => b.attempts - a.attempts || a.scamType.localeCompare(b.scamType));
  const colWidth = WIDTH / 2 - 8;
  for (let i = 0; i < covered.length; i += 2) {
    w.ensure(13);
    covered.slice(i, i + 2).forEach((t, col) => {
      const label = t.scamType === "none" ? r.legitTopic : scamTypeLabel(strings, t.scamType);
      const line = format(t.attempts === 1 ? r.topicLineOne : r.topicLine, { label, attempts: t.attempts, accuracy: percent(t.accuracy) });
      w.text(line, MARGIN + col * (colWidth + 16), { size: 8.5, width: colWidth });
    });
    w.y -= 13;
  }
  w.heading(r.methodology);
  w.paragraph(r.methodologyText);
  w.heading(r.attestation);
  w.paragraph(r.attestationText, 9, INK);
  w.ensure(70);
  w.y -= 26;
  const half = WIDTH / 2;
  for (const [label, x] of [[r.preparedBy, MARGIN], [r.titleLabel, MARGIN + half]] as const) {
    w.page.drawLine({ start: { x: x + 70, y: w.y }, end: { x: x + half - 16, y: w.y }, thickness: 0.75, color: INK });
    w.text(label, x, { size: 9, color: MUTED });
  }
  w.y -= 30;
  for (const [label, x] of [[r.signature, MARGIN], [r.date, MARGIN + half]] as const) {
    w.page.drawLine({ start: { x: x + 70, y: w.y }, end: { x: x + half - 16, y: w.y }, thickness: 0.75, color: INK });
    w.text(label, x, { size: 9, color: MUTED });
  }

  // Footers
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const label = format(r.page, { page: i + 1, pages: pages.length });
    const width = fonts.regular.widthOfTextAtSize(label, 7.5);
    const footer = fit(fonts.regular, `${companyName} - ${r.generated} ${generated}`, 7.5, WIDTH - width - 12);
    page.drawText(footer, { x: MARGIN, y: 28, size: 7.5, font: fonts.regular, color: MUTED });
    page.drawText(label, { x: MARGIN + WIDTH - width, y: 28, size: 7.5, font: fonts.regular, color: MUTED });
  });

  return doc.save();
}

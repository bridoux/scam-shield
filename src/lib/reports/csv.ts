import type { UiStrings } from "../content";
import { percent, type TrainingRecord } from "./record";

export type CsvCell = string | number | null;

/** Text a spreadsheet would run as a formula. Prefixing a quote makes it plain text. */
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvCell): string {
  if (value === null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV with CRLF line endings and a BOM so Excel reads UTF-8 names correctly. */
export function toCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  return `﻿${[header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

/** One row per employee, same columns as the PDF table. */
export function recordCsv(record: TrainingRecord, strings: UiStrings): string {
  const status = strings.dashboard.status;
  const roles = strings.team.roles as Record<string, string>;
  const rows = record.employees.map((e) => [
    e.displayName,
    e.email,
    e.teamName,
    roles[e.role] ?? e.role,
    e.joinedOn,
    e.requiredDays,
    e.completedDays,
    e.completion === null ? null : Number(percent(e.completion)),
    e.accuracy === null ? null : Number(percent(e.accuracy)),
    e.roundDates.length,
    e.points,
    e.lastPlayed,
    status[e.status],
  ]);
  return toCsv(strings.record.csvColumns, rows);
}

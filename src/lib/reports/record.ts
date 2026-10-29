import { addDays, isoWeekday } from "../progress/calendar";
import { DEFAULT_PLAY_DAYS } from "../progress/streak";
import type { Period } from "./period";

/** Completion at or above this share of training days is "on track". */
export const COMPLETION_TARGET = 0.8;

/** One member's period, as returned by the training_report database function. */
export interface ReportRow {
  userId: string;
  displayName: string;
  email: string;
  teamName: string | null;
  role: string;
  joinedOn: string;
  /** The day their access was turned off, or null for current members. */
  leftOn: string | null;
  /** Days with a completed record round in the period. */
  roundDates: string[];
  cards: number;
  correct: number;
  points: number;
}

export interface TopicRow {
  scamType: string;
  attempts: number;
  misses: number;
}

export type RecordStatus = "on_track" | "behind" | "new";

export interface EmployeeRecord extends ReportRow {
  requiredDays: number;
  completedDays: number;
  /** 0–1, or null when there were no training days to count yet. */
  completion: number | null;
  /** 0–1, or null when no cards were answered. */
  accuracy: number | null;
  lastPlayed: string | null;
  status: RecordStatus;
}

export interface TopicRecord extends TopicRow {
  accuracy: number;
}

export interface TrainingRecord {
  period: Period;
  playDays: number[];
  /** Behind first (lowest completion first), then on track, then new. */
  employees: EmployeeRecord[];
  summary: {
    employees: number;
    onTrack: number;
    behind: number;
    new: number;
    avgCompletion: number | null;
    avgAccuracy: number | null;
    rounds: number;
  };
  /** Weakest first. */
  topics: TopicRecord[];
}

/**
 * Training days an employee was expected to play: the company's play days from the later of
 * the period start and their join date, up to the period end. Today only counts once they've
 * played it, so nobody looks behind in the morning.
 */
export function requiredDays(playDays: readonly number[], start: string, end: string, today: string, playedToday: boolean): string[] {
  const days = new Set(playDays.length > 0 ? playDays : DEFAULT_PLAY_DAYS);
  const last = end > today ? today : end;
  const out: string[] = [];
  for (let day = start; day <= last; day = addDays(day, 1)) {
    if (day === today && !playedToday) continue;
    if (days.has(isoWeekday(day))) out.push(day);
  }
  return out;
}

export function employeeRecord(row: ReportRow, playDays: readonly number[], period: Period, today: string): EmployeeRecord {
  const start = row.joinedOn > period.from ? row.joinedOn : period.from;
  // Someone who left was expected to train up to the day before they left.
  const lastDay = row.leftOn ? addDays(row.leftOn, -1) : period.to;
  const end = lastDay < period.to ? lastDay : period.to;
  const played = new Set(row.roundDates);
  const required = requiredDays(playDays, start, end, today, played.has(today));
  const completedDays = required.filter((d) => played.has(d)).length;
  const completion = required.length === 0 ? null : completedDays / required.length;
  const status: RecordStatus = completion === null ? "new" : completion >= COMPLETION_TARGET ? "on_track" : "behind";
  return {
    ...row,
    requiredDays: required.length,
    completedDays,
    completion,
    accuracy: row.cards === 0 ? null : row.correct / row.cards,
    lastPlayed: row.roundDates.length > 0 ? [...row.roundDates].sort().at(-1)! : null,
    status,
  };
}

const STATUS_ORDER: Record<RecordStatus, number> = { behind: 0, on_track: 1, new: 2 };

export function buildRecord(
  rows: readonly ReportRow[],
  topics: readonly TopicRow[],
  playDays: readonly number[],
  period: Period,
  today: string,
): TrainingRecord {
  const employees = rows
    .map((row) => employeeRecord(row, playDays, period, today))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.completion ?? 0) - (b.completion ?? 0) ||
        a.displayName.localeCompare(b.displayName),
    );

  const counted = employees.filter((e) => e.completion !== null);
  const cards = employees.reduce((sum, e) => sum + e.cards, 0);
  const correct = employees.reduce((sum, e) => sum + e.correct, 0);

  return {
    period,
    playDays: [...playDays],
    employees,
    summary: {
      employees: employees.length,
      onTrack: employees.filter((e) => e.status === "on_track").length,
      behind: employees.filter((e) => e.status === "behind").length,
      new: employees.filter((e) => e.status === "new").length,
      avgCompletion: counted.length === 0 ? null : counted.reduce((sum, e) => sum + e.completion!, 0) / counted.length,
      // Company-wide share correct, so a one-card player doesn't weigh as much as a daily one.
      avgAccuracy: cards === 0 ? null : correct / cards,
      rounds: employees.reduce((sum, e) => sum + e.roundDates.length, 0),
    },
    topics: topics
      .filter((t) => t.attempts > 0)
      // Clamped so inconsistent input can never print a negative or >100% figure on the record.
      .map((t) => ({ ...t, accuracy: Math.min(1, Math.max(0, (t.attempts - t.misses) / t.attempts)) }))
      .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts),
  };
}

/** Fewer answers than this is too little to call a scam type a weak spot. */
export const MIN_TOPIC_ATTEMPTS = 3;
export const WEAK_TOPICS_SHOWN = 8;

/** The scam types the team handles worst, ignoring types answered only once or twice. */
export function weakestTopics(topics: readonly TopicRecord[]): TopicRecord[] {
  return topics.filter((t) => t.attempts >= MIN_TOPIC_ATTEMPTS).slice(0, WEAK_TOPICS_SHOWN);
}

/** 0.873 → "87". Null → "—". */
export function percent(value: number | null): string {
  return value === null ? "—" : String(Math.round(value * 100));
}

import { addDays, daysBetween } from "../progress/calendar";

export type PeriodPreset = "30d" | "90d" | "12m" | "custom";

export interface Period {
  /** Inclusive company-local days, "YYYY-MM-DD". */
  from: string;
  to: string;
  preset: PeriodPreset;
}

/** The database functions refuse longer spans. */
export const MAX_PERIOD_DAYS = 366;

const PRESET_DAYS: Record<Exclude<PeriodPreset, "custom">, number> = { "30d": 30, "90d": 90, "12m": 365 };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function isDay(value: unknown): value is string {
  // Before 2000 can't be a real training period, and Date.UTC maps years 0-99 to 1900-1999.
  if (typeof value !== "string" || !DAY.test(value) || value < "2000-01-01") return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Reads ?range=30d|90d|12m or ?from=YYYY-MM-DD&to=YYYY-MM-DD. Anything invalid falls back to
 * the last 30 days. Custom ranges are clamped to end today and to at most MAX_PERIOD_DAYS.
 */
export function parsePeriod(params: { range?: unknown; from?: unknown; to?: unknown }, today: string): Period {
  if (isDay(params.from) && isDay(params.to)) {
    const to = params.to > today ? today : params.to;
    const from = params.from;
    if (from <= to && daysBetween(from, to) < MAX_PERIOD_DAYS) return { from, to, preset: "custom" };
  }
  // Own keys only: "constructor" or "__proto__" must fall back too, not crash.
  const preset =
    typeof params.range === "string" && Object.hasOwn(PRESET_DAYS, params.range) ? (params.range as keyof typeof PRESET_DAYS) : "30d";
  return { from: addDays(today, -(PRESET_DAYS[preset] - 1)), to: today, preset };
}

/** Query string for links and downloads that keep the same period. */
export function periodQuery(period: Period): string {
  return period.preset === "custom" ? `from=${period.from}&to=${period.to}` : `range=${period.preset}`;
}

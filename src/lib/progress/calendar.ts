/** Calendar helpers on "YYYY-MM-DD" day strings (no time zone: the day is already local to the company). */

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  return fromUtc(toUtc(day) + days * DAY_MS);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(day: string): number {
  const d = new Date(toUtc(day)).getUTCDay();
  return d === 0 ? 7 : d;
}

/** The Monday that starts the week containing `day`. */
export function weekStart(day: string): string {
  return addDays(day, 1 - isoWeekday(day));
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

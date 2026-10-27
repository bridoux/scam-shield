import { addDays, daysBetween, isoWeekday } from "./calendar";

export const DEFAULT_PLAY_DAYS: readonly number[] = [1, 2, 3, 4, 5];
/** How far back the best streak is searched. */
const MAX_LOOKBACK_DAYS = 730;

export interface StreakInfo {
  /** Required days in a row with a completed record round, up to today. */
  current: number;
  best: number;
  playedToday: boolean;
  /** True when today is one of the company's play days. */
  todayRequired: boolean;
}

/**
 * Streaks count the company's play days only. A play day without a completed
 * record round breaks the streak; other days are skipped (playing then earns
 * points but doesn't extend it). Today never breaks it: the day isn't over.
 */
export function computeStreak(playedDays: Iterable<string>, playDays: readonly number[], today: string): StreakInfo {
  const required = new Set(playDays.length > 0 ? playDays : DEFAULT_PLAY_DAYS);
  const played = new Set(playedDays);
  const isRequired = (day: string) => required.has(isoWeekday(day));

  let current = 0;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const day = addDays(today, -i);
    if (!isRequired(day)) continue;
    if (played.has(day)) current++;
    else if (i > 0) break;
  }

  let best = current;
  const earliest = [...played].filter((d) => daysBetween(d, today) >= 0).sort()[0];
  if (earliest) {
    const start = daysBetween(earliest, today) > MAX_LOOKBACK_DAYS ? addDays(today, -MAX_LOOKBACK_DAYS) : earliest;
    let run = 0;
    for (let day = start; daysBetween(day, today) >= 0; day = addDays(day, 1)) {
      if (!isRequired(day)) continue;
      if (played.has(day)) best = Math.max(best, ++run);
      else if (day !== today) run = 0;
    }
  }

  return { current, best, playedToday: played.has(today), todayRequired: isRequired(today) };
}

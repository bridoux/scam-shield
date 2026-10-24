/** Level tiers by lifetime record points. A daily player earns roughly 80–140 points a day. */
export const LEVELS = [
  { key: "rookie", min: 0 },
  { key: "spotter", min: 300 },
  { key: "sentinel", min: 1000 },
  { key: "guardian", min: 2500 },
  { key: "defender", min: 5000 },
  { key: "shield", min: 9000 },
] as const;

export type LevelKey = (typeof LEVELS)[number]["key"];

export interface LevelInfo {
  key: LevelKey;
  /** 1-based level number. */
  number: number;
  points: number;
  /** Points needed for the next level, or null at the top. */
  next: number | null;
  /** 0–1 progress from this level's threshold to the next (1 at the top). */
  progress: number;
}

export function levelFor(points: number): LevelInfo {
  const safe = Math.max(0, Math.floor(points));
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (safe >= LEVELS[i].min) index = i;
  const current = LEVELS[index];
  const upcoming = LEVELS[index + 1];
  return {
    key: current.key,
    number: index + 1,
    points: safe,
    next: upcoming ? upcoming.min : null,
    progress: upcoming ? (safe - current.min) / (upcoming.min - current.min) : 1,
  };
}

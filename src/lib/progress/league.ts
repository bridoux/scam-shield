/** One company member's week, as returned by the weekly_league database function. */
export interface LeagueRow {
  userId: string;
  displayName: string;
  teamId: string | null;
  teamName: string | null;
  points: number;
  rounds: number;
}

export interface PlayerStanding extends LeagueRow {
  /** Competition ranking: ties share a rank (1, 1, 3). */
  rank: number;
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  members: number;
  points: number;
  /** Points per member, one decimal. Members who didn't play count as 0. */
  average: number;
  rank: number;
}

/** Adds competition ranks to an already-sorted list: equal scores share the earlier rank. */
function withRanks<T>(sorted: readonly T[], score: (item: T) => number): (T & { rank: number })[] {
  const ranked: (T & { rank: number })[] = [];
  sorted.forEach((item, i) => {
    const tied = i > 0 && score(sorted[i - 1]) === score(item);
    ranked.push({ ...item, rank: tied ? ranked[i - 1].rank : i + 1 });
  });
  return ranked;
}

export function rankPlayers(rows: readonly LeagueRow[]): PlayerStanding[] {
  const sorted = [...rows].sort(
    (a, b) => b.points - a.points || b.rounds - a.rounds || a.displayName.localeCompare(b.displayName),
  );
  return withRanks(sorted, (r) => r.points);
}

export function rankTeams(rows: readonly LeagueRow[]): TeamStanding[] {
  const teams = new Map<string, { teamName: string; members: number; points: number }>();
  for (const row of rows) {
    if (!row.teamId) continue;
    const team = teams.get(row.teamId) ?? { teamName: row.teamName ?? "", members: 0, points: 0 };
    teams.set(row.teamId, { ...team, members: team.members + 1, points: team.points + row.points });
  }
  const sorted = [...teams.entries()]
    .map(([teamId, t]) => ({ teamId, ...t, average: Math.round((t.points / t.members) * 10) / 10 }))
    .sort((a, b) => b.average - a.average || b.points - a.points || a.teamName.localeCompare(b.teamName));
  return withRanks(sorted, (t) => t.average);
}

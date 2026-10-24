import "server-only";
import type { Member } from "../auth";
import { localDate } from "../play/dates";
import type { PlayerProgress } from "../play/types";
import type { createClient } from "../supabase/server";
import { weekStart } from "./calendar";
import { rankPlayers, type LeagueRow } from "./league";
import { levelFor } from "./levels";
import { computeStreak } from "./streak";

type UserClient = Awaited<ReturnType<typeof createClient>>;

/** This week's league rows for the member's company, through the RLS-scoped database function. */
export async function loadLeague(client: UserClient, week: string): Promise<LeagueRow[]> {
  const { data, error } = await client.rpc("weekly_league", { week_start: week });
  if (error) throw new Error(`Loading the league failed: ${error.message}`);
  return data.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    teamId: r.team_id,
    teamName: r.team_name,
    points: r.points,
    rounds: r.rounds,
  }));
}

/** Level, streak and league position for the signed-in member. Reads only their own rounds (RLS). */
export async function loadProgress(client: UserClient, member: Member, now = new Date()): Promise<PlayerProgress> {
  const today = localDate(now, member.timeZone);
  const [{ data: rounds, error }, league] = await Promise.all([
    client
      .from("rounds")
      .select("round_date, points")
      .eq("user_id", member.userId)
      .eq("is_practice", false)
      .not("completed_at", "is", null),
    // The league is a nice-to-have on these screens: log and carry on without it.
    loadLeague(client, weekStart(today)).catch((leagueError: unknown) => {
      console.error("[progress] league unavailable", leagueError);
      return null;
    }),
  ]);
  if (error) throw new Error(`Loading rounds failed: ${error.message}`);

  const lifetimePoints = rounds.reduce((sum, r) => sum + (r.points ?? 0), 0);
  const me = league ? rankPlayers(league).find((p) => p.userId === member.userId) : undefined;
  return {
    lifetimePoints,
    level: levelFor(lifetimePoints),
    streak: computeStreak(
      rounds.map((r) => r.round_date),
      member.playDays,
      today,
    ),
    league: me && league ? { rank: me.rank, players: league.length, weekPoints: me.points } : null,
  };
}

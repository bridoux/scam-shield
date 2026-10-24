import { describe, expect, it } from "vitest";
import { rankPlayers, rankTeams, type LeagueRow } from "./league";

const row = (userId: string, points: number, teamId: string | null = "t1", rounds = points > 0 ? 1 : 0): LeagueRow => ({
  userId,
  displayName: userId.toUpperCase(),
  teamId,
  teamName: teamId ? `Team ${teamId}` : null,
  points,
  rounds,
});

describe("rankPlayers", () => {
  it("orders by points and shares ranks on ties", () => {
    const ranked = rankPlayers([row("a", 90), row("b", 120), row("c", 90), row("d", 0)]);
    expect(ranked.map((r) => [r.userId, r.rank])).toEqual([
      ["b", 1],
      ["a", 2],
      ["c", 2],
      ["d", 4],
    ]);
  });

  it("breaks point ties by rounds played for display order", () => {
    const ranked = rankPlayers([row("a", 100, "t1", 1), row("b", 100, "t1", 2)]);
    expect(ranked.map((r) => r.userId)).toEqual(["b", "a"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1]);
  });
});

describe("rankTeams", () => {
  it("ranks teams by average points per member, counting members who didn't play", () => {
    const rows = [
      row("a", 300, "small"),
      row("b", 300, "small"),
      row("c", 0, "small"), // small: 600 / 3 = 200
      row("d", 250, "big"),
      row("e", 250, "big"),
      row("f", 250, "big"),
      row("g", 250, "big"), // big: 1000 / 4 = 250
      row("h", 999, null), // no team: players board only
    ];
    const teams = rankTeams(rows);
    expect(teams.map((t) => [t.teamId, t.members, t.points, t.average, t.rank])).toEqual([
      ["big", 4, 1000, 250, 1],
      ["small", 3, 600, 200, 2],
    ]);
  });

  it("returns no teams when nobody has one", () => {
    expect(rankTeams([row("a", 10, null)])).toEqual([]);
  });
});

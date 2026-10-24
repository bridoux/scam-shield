import { describe, expect, it } from "vitest";
import { addDays, isoWeekday, weekStart } from "./calendar";
import { computeStreak } from "./streak";

const MON_FRI = [1, 2, 3, 4, 5];
const MON_SAT = [1, 2, 3, 4, 5, 6];
// 2026-10-19 is a Monday.
const MON = "2026-10-19";
const day = (offset: number) => addDays(MON, offset);

describe("calendar helpers", () => {
  it("knows weekdays and week starts", () => {
    expect(isoWeekday(MON)).toBe(1);
    expect(isoWeekday(day(6))).toBe(7);
    expect(weekStart(day(6))).toBe(MON);
    expect(weekStart(day(7))).toBe(day(7));
  });
});

describe("computeStreak", () => {
  it("counts consecutive required days up to today", () => {
    const s = computeStreak([day(0), day(1), day(2)], MON_FRI, day(2));
    expect(s).toEqual({ current: 3, best: 3, playedToday: true, todayRequired: true });
  });

  it("keeps the streak alive until today is over", () => {
    const s = computeStreak([day(0), day(1)], MON_FRI, day(2));
    expect(s.current).toBe(2);
    expect(s.playedToday).toBe(false);
  });

  it("skips weekends for a Monday–Friday company", () => {
    const fridayToMonday = computeStreak([day(3), day(4), day(7)], MON_FRI, day(7));
    expect(fridayToMonday.current).toBe(3);
  });

  it("breaks on a missed Saturday when the owner requires Saturdays", () => {
    const s = computeStreak([day(3), day(4), day(7)], MON_SAT, day(7));
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });

  it("doesn't extend the streak for rounds on optional days", () => {
    const s = computeStreak([day(4), day(5), day(6), day(7)], MON_FRI, day(7));
    expect(s.current).toBe(2); // Friday + Monday; the weekend rounds are bonus play
  });

  it("breaks on a missed required day and remembers the best run", () => {
    const played = [day(0), day(1), day(2), day(3), /* Fri missed */ day(7), day(8)];
    const s = computeStreak(played, MON_FRI, day(8));
    expect(s.current).toBe(2);
    expect(s.best).toBe(4);
  });

  it("returns zero for a new player and on a missed yesterday", () => {
    expect(computeStreak([], MON_FRI, MON).current).toBe(0);
    expect(computeStreak([day(0)], MON_FRI, day(2)).current).toBe(0);
  });

  it("falls back to Monday–Friday when no play days are set", () => {
    expect(computeStreak([day(4), day(7)], [], day(7)).current).toBe(2);
  });
});

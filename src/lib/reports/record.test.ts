import { describe, expect, it } from "vitest";
import { parsePeriod, periodQuery } from "./period";
import { buildRecord, employeeRecord, percent, requiredDays, weakestTopics, type ReportRow } from "./record";

const MON_FRI = [1, 2, 3, 4, 5];
// 2026-10-19 is a Monday; "today" is Friday 2026-10-30.
const TODAY = "2026-10-30";
const period = { from: "2026-10-19", to: TODAY, preset: "custom" as const };

const row = (overrides: Partial<ReportRow>): ReportRow => ({
  userId: "u1",
  displayName: "Dana",
  email: "dana@dealer.example",
  teamName: "Sales",
  role: "player",
  joinedOn: "2026-10-01",
  leftOn: null,
  roundDates: [],
  cards: 0,
  correct: 0,
  points: 0,
  ...overrides,
});

describe("parsePeriod", () => {
  it("defaults to the last 30 days, inclusive of today", () => {
    expect(parsePeriod({}, TODAY)).toEqual({ from: "2026-10-01", to: TODAY, preset: "30d" });
  });

  it("supports presets and custom ranges", () => {
    expect(parsePeriod({ range: "90d" }, TODAY).from).toBe("2026-08-02");
    expect(parsePeriod({ range: "12m" }, TODAY).from).toBe("2025-10-31");
    expect(parsePeriod({ from: "2026-09-01", to: "2026-09-30" }, TODAY)).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
      preset: "custom",
    });
  });

  it("clamps the end to today and rejects bad or oversized ranges", () => {
    expect(parsePeriod({ from: "2026-10-01", to: "2027-01-01" }, TODAY).to).toBe(TODAY);
    expect(parsePeriod({ from: "2026-10-20", to: "2026-10-01" }, TODAY).preset).toBe("30d");
    expect(parsePeriod({ from: "2024-01-01", to: "2026-10-30" }, TODAY).preset).toBe("30d");
    expect(parsePeriod({ from: "2026-02-30", to: "2026-03-01" }, TODAY).preset).toBe("30d");
    expect(parsePeriod({ from: "x", to: "y", range: "weird" }, TODAY).preset).toBe("30d");
    for (const range of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      expect(parsePeriod({ range }, TODAY), range).toEqual({ from: "2026-10-01", to: TODAY, preset: "30d" });
    }
    expect(parsePeriod({ from: "0000-01-01", to: "0000-02-01" }, TODAY).preset).toBe("30d");
    expect(parsePeriod({ from: "0099-01-01", to: "0102-01-01" }, TODAY).preset).toBe("30d");
  });

  it("round-trips through the query string", () => {
    expect(periodQuery(parsePeriod({ range: "90d" }, TODAY))).toBe("range=90d");
    expect(periodQuery({ from: "2026-09-01", to: "2026-09-30", preset: "custom" })).toBe("from=2026-09-01&to=2026-09-30");
  });
});

describe("requiredDays", () => {
  it("counts the company's training days, and today only once played", () => {
    expect(requiredDays(MON_FRI, "2026-10-19", TODAY, TODAY, false)).toHaveLength(9);
    expect(requiredDays(MON_FRI, "2026-10-19", TODAY, TODAY, true)).toHaveLength(10);
    expect(requiredDays([1, 2, 3, 4, 5, 6], "2026-10-19", TODAY, TODAY, true)).toHaveLength(11);
  });
});

describe("employeeRecord", () => {
  it("computes completion over training days since the later of period start and joining", () => {
    const played = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-26", "2026-10-27", "2026-10-28"];
    const e = employeeRecord(row({ roundDates: played, cards: 80, correct: 60 }), MON_FRI, period, TODAY);
    expect(e.requiredDays).toBe(9);
    expect(e.completedDays).toBe(8);
    expect(e.completion).toBeCloseTo(8 / 9);
    expect(e.status).toBe("on_track");
    expect(e.accuracy).toBeCloseTo(0.75);
    expect(e.lastPlayed).toBe("2026-10-28");
  });

  it("only counts days since a mid-period join", () => {
    const e = employeeRecord(row({ joinedOn: "2026-10-28", roundDates: ["2026-10-28"] }), MON_FRI, period, TODAY);
    expect(e.requiredDays).toBe(2); // Wed + Thu; today not played yet
    expect(e.completion).toBe(0.5);
    expect(e.status).toBe("behind");
  });

  it("stops counting training days the day before someone left", () => {
    // Left on Thursday 10-22: Mon–Wed were training days, played Mon and Tue.
    const e = employeeRecord(row({ leftOn: "2026-10-22", roundDates: ["2026-10-19", "2026-10-20"] }), MON_FRI, period, TODAY);
    expect(e.requiredDays).toBe(3);
    expect(e.completedDays).toBe(2);
    expect(e.leftOn).toBe("2026-10-22");
  });

  it("counts no training days for someone who left on their first day", () => {
    const e = employeeRecord(row({ joinedOn: "2026-10-20", leftOn: "2026-10-20" }), MON_FRI, period, TODAY);
    expect(e).toMatchObject({ requiredDays: 0, completion: null, status: "new" });
  });

  it("ignores weekend rounds for completion and marks people who joined today as new", () => {
    const weekend = employeeRecord(row({ roundDates: ["2026-10-24", "2026-10-25"] }), MON_FRI, period, TODAY);
    expect(weekend.completedDays).toBe(0);
    expect(weekend.status).toBe("behind");
    const joinedToday = employeeRecord(row({ joinedOn: TODAY }), MON_FRI, period, TODAY);
    expect(joinedToday).toMatchObject({ requiredDays: 0, completion: null, status: "new", accuracy: null, lastPlayed: null });
  });
});

describe("buildRecord", () => {
  it("summarizes the company and lists who is behind first", () => {
    const rows = [
      row({ userId: "a", displayName: "Avery", roundDates: ["2026-10-19"], cards: 10, correct: 9 }),
      row({
        userId: "b",
        displayName: "Blake",
        roundDates: ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"],
        cards: 90,
        correct: 45,
      }),
      row({ userId: "c", displayName: "Casey", joinedOn: TODAY }),
    ];
    const topics = [
      { scamType: "gift_card", attempts: 10, misses: 1 },
      { scamType: "wire_change", attempts: 8, misses: 6 },
      { scamType: "none", attempts: 0, misses: 0 },
    ];
    const record = buildRecord(rows, topics, MON_FRI, period, TODAY);
    expect(record.employees.map((e) => [e.displayName, e.status])).toEqual([
      ["Avery", "behind"],
      ["Blake", "on_track"],
      ["Casey", "new"],
    ]);
    expect(record.summary).toMatchObject({ employees: 3, onTrack: 1, behind: 1, new: 1, rounds: 10 });
    expect(record.summary.avgCompletion).toBeCloseTo((1 / 9 + 1) / 2);
    expect(record.summary.avgAccuracy).toBeCloseTo(54 / 100);
    expect(record.topics.map((t) => t.scamType)).toEqual(["wire_change", "gift_card"]);
  });

  it("keeps topic accuracy between 0 and 100% even for inconsistent input", () => {
    const record = buildRecord([], [{ scamType: "x", attempts: 1, misses: 3 }], MON_FRI, period, TODAY);
    expect(record.topics[0].accuracy).toBe(0);
  });

  it("handles a company with no rounds yet", () => {
    const record = buildRecord([], [], MON_FRI, period, TODAY);
    expect(record.summary).toEqual({ employees: 0, onTrack: 0, behind: 0, new: 0, avgCompletion: null, avgAccuracy: null, rounds: 0 });
  });
});

describe("weakestTopics", () => {
  it("keeps the 8 weakest types with at least 3 answers, already sorted weakest first", () => {
    const topics = [
      { scamType: "one_off", attempts: 1, misses: 1, accuracy: 0 },
      ...Array.from({ length: 10 }, (_, i) => ({ scamType: `t${i}`, attempts: 5, misses: 5 - (i % 6), accuracy: (i % 6) / 5 })),
    ].sort((a, b) => a.accuracy - b.accuracy);
    const weak = weakestTopics(topics);
    expect(weak).toHaveLength(8);
    expect(weak.some((t) => t.scamType === "one_off")).toBe(false);
    expect(weak.map((t) => t.accuracy)).toEqual([...weak.map((t) => t.accuracy)].sort((a, b) => a - b));
  });
});

describe("percent", () => {
  it("rounds and shows a dash for missing values", () => {
    expect(percent(0.876)).toBe("88");
    expect(percent(null)).toBe("—");
  });
});

import { describe, expect, it } from "vitest";
import { LEVELS, levelFor } from "./levels";

describe("levelFor", () => {
  it("starts everyone as a rookie", () => {
    expect(levelFor(0)).toEqual({ key: "rookie", number: 1, points: 0, next: 300, progress: 0 });
  });

  it("reports progress toward the next tier", () => {
    const l = levelFor(650);
    expect(l.key).toBe("spotter");
    expect(l.number).toBe(2);
    expect(l.next).toBe(1000);
    expect(l.progress).toBeCloseTo(0.5);
  });

  it("moves up exactly at each threshold", () => {
    for (const [i, tier] of LEVELS.entries()) {
      expect(levelFor(tier.min).number).toBe(i + 1);
      if (tier.min > 0) expect(levelFor(tier.min - 1).number).toBe(i);
    }
  });

  it("caps at the top level", () => {
    const top = levelFor(1_000_000);
    expect(top.key).toBe("shield");
    expect(top.next).toBeNull();
    expect(top.progress).toBe(1);
  });

  it("treats negative or fractional points safely", () => {
    expect(levelFor(-5).points).toBe(0);
    expect(levelFor(299.9).key).toBe("rookie");
  });
});

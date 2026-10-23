import { describe, expect, it } from "vitest";
import { SWIPE_THRESHOLD, verdictFromDrag } from "./swipe";

describe("verdictFromDrag", () => {
  it("maps a long drag right to legit and left to scam", () => {
    expect(verdictFromDrag(SWIPE_THRESHOLD, 0)).toBe("legit");
    expect(verdictFromDrag(-SWIPE_THRESHOLD - 30, 0)).toBe("scam");
  });

  it("snaps back on a short, slow drag", () => {
    expect(verdictFromDrag(60, 100)).toBeNull();
    expect(verdictFromDrag(-60, -100)).toBeNull();
  });

  it("accepts a quick flick past the minimum distance", () => {
    expect(verdictFromDrag(50, 900)).toBe("legit");
    expect(verdictFromDrag(-50, -900)).toBe("scam");
  });

  it("ignores a fast tap with almost no movement or a flick against the drag", () => {
    expect(verdictFromDrag(10, 2000)).toBeNull();
    expect(verdictFromDrag(50, -900)).toBeNull();
  });
});

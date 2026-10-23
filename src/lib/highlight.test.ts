import { describe, expect, it } from "vitest";
import { getScenarios } from "./content";
import { flagsByField, segmentText, type NumberedFlag } from "./highlight";

const flag = (id: string, target: string, number = 1): NumberedFlag => ({
  id,
  target,
  number,
  label: id,
  explanation: "",
});

describe("segmentText", () => {
  it("returns the whole text when there are no flags", () => {
    expect(segmentText("hello world", [])).toEqual([{ text: "hello world" }]);
  });

  it("wraps targets in order, regardless of flag order", () => {
    const a = flag("a", "wire", 1);
    const b = flag("b", "today", 2);
    const segments = segmentText("Send the wire today please", [b, a]);
    expect(segments.map((s) => s.text).join("")).toBe("Send the wire today please");
    expect(segments).toEqual([
      { text: "Send the " },
      { text: "wire", flag: a },
      { text: " " },
      { text: "today", flag: b },
      { text: " please" },
    ]);
  });

  it("handles targets at the start and end", () => {
    const segments = segmentText("urgent: pay now", [flag("a", "urgent"), flag("b", "now", 2)]);
    expect(segments.map((s) => s.text)).toEqual(["urgent", ": pay ", "now"]);
  });

  it("skips overlapping and missing targets without losing text", () => {
    const text = "verify your account now";
    const segments = segmentText(text, [
      flag("a", "verify your"),
      flag("b", "your account", 2),
      flag("c", "missing", 3),
    ]);
    expect(segments.map((s) => s.text).join("")).toBe(text);
    expect(segments.filter((s) => s.flag).map((s) => s.flag!.id)).toEqual(["a"]);
  });
});

describe("flagsByField", () => {
  it("places each flag in the first field containing its target", () => {
    const scenario = getScenarios("en-US").find((s) => s.id === "credential-phish-cloudsuite")!;
    const byField = flagsByField(scenario);
    expect(byField.senderAddress.map((f) => f.id)).toEqual(["sender-domain"]);
    expect(byField.body.map((f) => f.id)).toEqual(["bait", "deletion-threat", "login-link"]);
    expect(byField.body[0].number).toBe(2);
  });
});

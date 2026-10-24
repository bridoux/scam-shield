import { describe, expect, it } from "vitest";
import { getScenarios } from "./content";
import { flagsByField, linkHost, segmentText, type NumberedFlag } from "./highlight";

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

describe("segmentText with links", () => {
  const link = (text: string, url = "https://portal.example/x") => ({ text, url });

  it("marks link text as a link segment", () => {
    const l = link("Open portal");
    expect(segmentText("Please Open portal today", [], [l])).toEqual([
      { text: "Please " },
      { text: "Open portal", link: l },
      { text: " today" },
    ]);
  });

  it("merges a link with a flag that targets the same text", () => {
    const f = flag("a", "REVIEW DOCUMENT");
    const l = link("REVIEW DOCUMENT", "https://signright-notice.example.app-docs.example/v/7731");
    const segments = segmentText("Tap REVIEW DOCUMENT now", [f], [l]);
    expect(segments[1]).toEqual({ text: "REVIEW DOCUMENT", flag: f, link: l });
    expect(segments.map((s) => s.text).join("")).toBe("Tap REVIEW DOCUMENT now");
  });

  it("keeps links and separate flags side by side", () => {
    const f = flag("a", "urgent");
    const l = link("pay here");
    const segments = segmentText("urgent: pay here", [f], [l]);
    expect(segments.map((s) => [s.text, Boolean(s.flag), Boolean(s.link)])).toEqual([
      ["urgent", true, false],
      [": ", false, false],
      ["pay here", false, true],
    ]);
  });
});

describe("linkHost", () => {
  it("returns the real host of a disguised URL", () => {
    expect(linkHost("https://signright-notice.example.app-docs.example/v/7731")).toBe(
      "signright-notice.example.app-docs.example",
    );
  });

  it("returns an empty string for unparseable input", () => {
    expect(linkHost("not a url")).toBe("");
  });
});

describe("flagsByField", () => {
  it("places each flag in the first field containing its target", () => {
    const scenario = getScenarios("en-US").find((s) => s.id === "credential-phish-cloudsuite")!;
    const byField = flagsByField(scenario, scenario.redFlags);
    expect(byField.senderAddress.map((f) => f.id)).toEqual(["sender-domain"]);
    expect(byField.body.map((f) => f.id)).toEqual(["bait", "deletion-threat", "login-link"]);
    expect(byField.body[0].number).toBe(2);
  });
});

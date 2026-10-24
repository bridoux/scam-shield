import { describe, expect, it } from "vitest";
import { cleanText, nameFromEmail, normalizeEmail, safeNextPath } from "./urls";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/join/abc")).toBe("/join/abc");
    expect(safeNextPath("/")).toBe("/");
  });

  it("rejects anything that could leave the site", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "join", "", null, 42]) {
      expect(safeNextPath(bad)).toBe("/");
    }
    expect(safeNextPath(`/${"a".repeat(250)}`)).toBe("/");
  });

  it("rejects paths that a URL parser would turn into another host", () => {
    for (const bad of ["/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/\u0000/evil.example", "/ /evil.example"]) {
      expect(safeNextPath(bad), JSON.stringify(bad)).toBe("/");
    }
    // What the sign-in page receives after the browser decodes "?next=/%09/evil.example".
    expect(safeNextPath(new URLSearchParams("next=/%09/evil.example").get("next"))).toBe("/");
  });

  it("keeps the query string of a same-site path", () => {
    expect(safeNextPath("/join/abc?x=1")).toBe("/join/abc?x=1");
  });
});

describe("normalizeEmail", () => {
  it("trims and lower-cases valid addresses", () => {
    expect(normalizeEmail("  Pat@Dealer.Example ")).toBe("pat@dealer.example");
  });

  it("rejects malformed input", () => {
    for (const bad of ["pat", "pat@", "@dealer.example", "pat @dealer.example", undefined, `${"a".repeat(250)}@x.example`]) {
      expect(normalizeEmail(bad)).toBeNull();
    }
  });
});

describe("cleanText", () => {
  it("collapses whitespace and enforces a maximum length", () => {
    expect(cleanText("  Lakeshore   Motors ", 120)).toBe("Lakeshore Motors");
    expect(cleanText("   ", 120)).toBeNull();
    expect(cleanText("abcdef", 5)).toBeNull();
    expect(cleanText(7, 5)).toBeNull();
  });
});

describe("nameFromEmail", () => {
  it("turns the local part into a readable name", () => {
    expect(nameFromEmail("pat.lee@dealer.example")).toBe("Pat Lee");
    expect(nameFromEmail("jo_smith+work@cpa.example")).toBe("Jo Smith Work");
  });
});

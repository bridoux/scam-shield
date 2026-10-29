import { describe, expect, it } from "vitest";
import { getLegalDoc, splitPlaceholders, type LegalDocName } from "./legal";

const DOCS: LegalDocName[] = ["privacy", "terms", "dpa"];

describe("splitPlaceholders", () => {
  it("marks bracketed capitals as placeholders", () => {
    expect(splitPlaceholders("Email [CONTACT EMAIL] today.")).toEqual([
      { text: "Email ", placeholder: false },
      { text: "[CONTACT EMAIL]", placeholder: true },
      { text: " today.", placeholder: false },
    ]);
  });

  it("leaves ordinary brackets and plain text alone", () => {
    expect(splitPlaceholders("see [note] here")).toEqual([{ text: "see [note] here", placeholder: false }]);
  });
});

describe("legal documents", () => {
  it.each(DOCS)("%s has a title, an intro and sections with content", (name) => {
    const doc = getLegalDoc("en-US", name);
    expect(doc.title).not.toBe("");
    expect(doc.intro.length).toBeGreaterThan(0);
    for (const section of doc.sections) {
      expect(section.heading).not.toBe("");
      expect((section.paragraphs?.length ?? 0) + (section.items?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it("names only the sub-processors the app really uses", () => {
    const text = JSON.stringify([getLegalDoc("en-US", "privacy"), getLegalDoc("en-US", "dpa")]);
    expect(text).toContain("Supabase");
    expect(text).toContain("Vercel");
    // Resend sends the operator's error alerts (src/lib/errors/alert-email.ts).
    expect(text).toContain("Resend");
    // No analytics or other email vendors until the code actually adds one.
    expect(text).not.toMatch(/Google Analytics|Segment|Mixpanel|SendGrid|Postmark/);
  });

  it("uses only the agreed placeholders", () => {
    const allowed = new Set(["[COMPANY NAME]", "[CONTACT EMAIL]", "[ADDRESS]", "[STATE]", "[EFFECTIVE DATE]", "[PRICING AND BILLING TERMS]", "[LIABILITY CAP]"]);
    const found = JSON.stringify(DOCS.map((d) => getLegalDoc("en-US", d))).match(/\[[A-Z][A-Z ]*[A-Z]\]/g) ?? [];
    expect(found.filter((p) => !allowed.has(p))).toEqual([]);
  });
});

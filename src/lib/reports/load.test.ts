import { describe, expect, it, vi } from "vitest";

// load.ts is server-only and talks to Supabase; only the pure file-name helper is tested here.
vi.mock("server-only", () => ({}));
vi.mock("../auth", () => ({ getSession: vi.fn() }));
vi.mock("../supabase/server", () => ({ createClient: vi.fn() }));

const { recordFileName } = await import("./load");

describe("recordFileName", () => {
  it("builds a header-safe file name from the company and period", () => {
    const period = { from: "2026-10-01", to: "2026-10-30", preset: "30d" as const };
    expect(recordFileName("Lakeshore Motors", period)).toBe("scam-shield-training-record-lakeshore-motors-2026-10-01-to-2026-10-30");
    expect(recordFileName('Évora "Tax" & Co.\r\nX-Evil: 1', period)).toBe(
      "scam-shield-training-record-evora-tax-co-x-evil-1-2026-10-01-to-2026-10-30",
    );
    expect(recordFileName("李雷", period)).toBe("scam-shield-training-record-2026-10-01-to-2026-10-30");
  });
});

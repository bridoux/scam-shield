import { describe, expect, it } from "vitest";
import { assertTestDatabase, PRODUCTION_PROJECT_REF } from "./guard";

describe("assertTestDatabase", () => {
  it("refuses the production project", () => {
    const env = { NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co` };
    expect(() => assertTestDatabase(env)).toThrow(/production database/);
  });

  it("refuses a missing URL", () => {
    expect(() => assertTestDatabase({})).toThrow(/not set/);
  });

  it("accepts another project", () => {
    expect(() => assertTestDatabase({ NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co" })).not.toThrow();
  });
});

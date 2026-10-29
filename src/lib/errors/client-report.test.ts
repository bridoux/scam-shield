import { describe, expect, it } from "vitest";
import { MAX_CLIENT_REPORT_BYTES, parseClientReport } from "./client-report";

const valid = { kind: "render", message: "TypeError: boom", path: "/play" };

describe("parseClientReport", () => {
  it("accepts a well-formed report", () => {
    expect(parseClientReport(JSON.stringify(valid))).toEqual(valid);
  });

  it("refuses bodies that aren't reports", () => {
    expect(parseClientReport("not json")).toBeNull();
    expect(parseClientReport("null")).toBeNull();
    expect(parseClientReport(JSON.stringify({ ...valid, kind: "other" }))).toBeNull();
    expect(parseClientReport(JSON.stringify({ ...valid, message: "  " }))).toBeNull();
    expect(parseClientReport(JSON.stringify({ ...valid, message: 7 }))).toBeNull();
    expect(parseClientReport(JSON.stringify({ ...valid, path: "https://evil.example/" }))).toBeNull();
  });

  it("refuses oversized bodies and fields", () => {
    expect(parseClientReport(" ".repeat(MAX_CLIENT_REPORT_BYTES + 1))).toBeNull();
    expect(parseClientReport(JSON.stringify({ ...valid, message: "x".repeat(1001) }))).toBeNull();
    expect(parseClientReport(JSON.stringify({ ...valid, path: `/${"x".repeat(500)}` }))).toBeNull();
  });
});

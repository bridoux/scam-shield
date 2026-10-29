import { describe, expect, it } from "vitest";
import { getStrings } from "../content";
import { csvCell, recordCsv, toCsv } from "./csv";
import { buildRecord } from "./record";

const strings = getStrings("en-US");

describe("csvCell", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("Lee, Pat")).toBe('"Lee, Pat"');
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
  });

  it("neutralises spreadsheet formulas in text", () => {
    expect(csvCell("=HYPERLINK(\"http://evil.example\")")).toBe(`"'=HYPERLINK(""http://evil.example"")"`);
    expect(csvCell("+1 555")).toBe("'+1 555");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("writes numbers and empties as-is", () => {
    expect(csvCell(87)).toBe("87");
    expect(csvCell(null)).toBe("");
    expect(csvCell(Number.NaN)).toBe("");
  });
});

describe("toCsv", () => {
  it("adds a BOM and uses CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("﻿a,b\r\n1,x\r\n");
  });
});

describe("recordCsv", () => {
  it("writes one row per employee with the record's columns", () => {
    const record = buildRecord(
      [
        {
          userId: "u1",
          displayName: "=Dana Ortiz",
          email: "dana@dealer.example",
          teamName: "Sales, floor",
          role: "admin",
          joinedOn: "2026-10-01",
          leftOn: null,
          roundDates: ["2026-10-29"],
          cards: 10,
          correct: 8,
          points: 95,
        },
      ],
      [],
      [1, 2, 3, 4, 5],
      { from: "2026-10-26", to: "2026-10-30", preset: "custom" },
      "2026-10-30",
    );
    const lines = recordCsv(record, strings).replace("﻿", "").trim().split("\r\n");
    expect(lines[0]).toBe(strings.record.csvColumns.join(","));
    expect(lines[1]).toBe(`'=Dana Ortiz,dana@dealer.example,"Sales, floor",Admin,2026-10-01,,4,1,25,80,1,95,2026-10-29,Behind`);
  });
});

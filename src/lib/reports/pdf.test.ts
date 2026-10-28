import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { getStrings } from "../content";
import { renderRecordPdf } from "./pdf";
import { buildRecord, type ReportRow } from "./record";

const strings = getStrings("en-US");
const period = { from: "2026-10-01", to: "2026-10-30", preset: "30d" as const };

function rows(count: number, name = (i: number) => `Employee ${i}`): ReportRow[] {
  return Array.from({ length: count }, (_, i) => ({
    userId: `u${i}`,
    displayName: name(i),
    email: `employee${i}@dealer.example`,
    teamName: i % 3 === 0 ? null : `Team ${i % 3}`,
    role: i === 0 ? "owner" : "player",
    joinedOn: "2026-09-15",
    roundDates: i % 2 ? ["2026-10-28", "2026-10-29"] : [],
    cards: i % 2 ? 20 : 0,
    correct: i % 2 ? 15 : 0,
    points: i % 2 ? 180 : 0,
  }));
}

async function render(employeeRows: ReportRow[]) {
  const record = buildRecord(
    employeeRows,
    [
      { scamType: "wire_change", attempts: 12, misses: 5 },
      { scamType: "none", attempts: 20, misses: 2 },
    ],
    [1, 2, 3, 4, 5],
    period,
    "2026-10-30",
  );
  const bytes = await renderRecordPdf({
    record,
    companyName: "Lakeshore Motors",
    timeZone: "America/Chicago",
    generatedAt: new Date("2026-10-30T15:00:00Z"),
    strings,
  });
  return { bytes, doc: await PDFDocument.load(bytes) };
}

describe("renderRecordPdf", () => {
  it("produces a valid one-page PDF for a small team", async () => {
    const { bytes, doc } = await render(rows(5));
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe(`${strings.record.title} - Lakeshore Motors`);
  });

  it("paginates 250 employees across several pages", async () => {
    const { doc } = await render(rows(250));
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(10);
  });

  it("keeps accented names and survives characters the PDF font can't draw", async () => {
    const names = ["Zoë Ångström", "José Núñez", "李雷", "Ama 🙂 Owusu", "Łukasz Żak"];
    const { doc } = await render(rows(names.length, (i) => names[i]));
    expect(doc.getPageCount()).toBe(1);
  });

  it("renders an empty company", async () => {
    const { doc } = await render([]);
    expect(doc.getPageCount()).toBe(1);
  });
});

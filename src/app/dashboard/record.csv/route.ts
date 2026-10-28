import type { NextRequest } from "next/server";
import { getStrings } from "@/lib/content";
import { recordCsv } from "@/lib/reports/csv";
import { downloadHeaders, refusal } from "@/lib/reports/http";
import { loadTrainingRecord, recordFileName } from "@/lib/reports/load";

/** The training record as CSV (one row per employee), for owners and admins. */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const access = await loadTrainingRecord(params);
  if (!access.ok) return refusal(access.reason);

  const { member, record } = access;
  return new Response(recordCsv(record, getStrings("en-US")), {
    headers: downloadHeaders("text/csv; charset=utf-8", `${recordFileName(member.organizationName, record.period)}.csv`),
  });
}

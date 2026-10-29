import type { NextRequest } from "next/server";
import { getStrings } from "@/lib/content";
import { recordCsv } from "@/lib/reports/csv";
import { authorizeDownload } from "@/lib/reports/downloads";
import { downloadHeaders } from "@/lib/reports/http";
import { recordFileName } from "@/lib/reports/load";

/** The training record as CSV (one row per employee), for owners and admins. */
export async function GET(request: NextRequest) {
  const access = await authorizeDownload(request, "csv");
  if (access instanceof Response) return access;

  const { member, record } = access;
  return new Response(recordCsv(record, getStrings("en-US")), {
    headers: downloadHeaders("text/csv; charset=utf-8", `${recordFileName(member.organizationName, record.period)}.csv`),
  });
}

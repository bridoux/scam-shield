import type { NextRequest } from "next/server";
import { getStrings } from "@/lib/content";
import { authorizeDownload } from "@/lib/reports/downloads";
import { downloadHeaders } from "@/lib/reports/http";
import { recordFileName } from "@/lib/reports/load";
import { renderRecordPdf } from "@/lib/reports/pdf";

/** The training record as a PDF, for owners and admins. Same period parameters as /dashboard. */
export async function GET(request: NextRequest) {
  const access = await authorizeDownload(Object.fromEntries(request.nextUrl.searchParams), "pdf");
  if (access instanceof Response) return access;

  const { member, record } = access;
  const pdf = await renderRecordPdf({
    record,
    companyName: member.organizationName,
    timeZone: member.timeZone,
    generatedAt: new Date(),
    strings: getStrings("en-US"),
  });
  return new Response(Buffer.from(pdf), {
    headers: downloadHeaders("application/pdf", `${recordFileName(member.organizationName, record.period)}.pdf`),
  });
}

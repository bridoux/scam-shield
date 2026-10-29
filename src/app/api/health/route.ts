import { connection } from "next/server";
import { reportLater } from "@/lib/errors/report";
import { createAdminClient } from "@/lib/supabase/admin";

const HEADERS = { "Cache-Control": "no-store" };

/**
 * For the uptime check (.github/workflows/uptime.yml): the site answers and the database reads.
 * Says nothing else, so it is safe to leave public.
 */
export async function GET() {
  await connection();
  const { error } = await createAdminClient().from("scenarios").select("id").limit(1);
  if (error) {
    // After the response: the check must get its 503 quickly, not wait on the (likely also failing) report.
    reportLater({ source: "health", scope: "health.database", error, route: "/api/health" });
    return Response.json({ status: "unavailable" }, { status: 503, headers: HEADERS });
  }
  return Response.json({ status: "ok" }, { headers: HEADERS });
}

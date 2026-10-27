/** Headers for a private file download that must never be cached by a shared cache. */
export function downloadHeaders(contentType: string, fileName: string): HeadersInit {
  // fileName is built from [a-z0-9-] and dates only (see recordFileName), so it is header-safe.
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

/** Plain-text refusal for the export routes: 401 when signed out, 403 otherwise. */
export function refusal(reason: "signed_out" | "no_company" | "forbidden"): Response {
  const status = reason === "signed_out" ? 401 : 403;
  const message = reason === "signed_out" ? "Sign in to download the training record." : "Only owners and admins can download the training record.";
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

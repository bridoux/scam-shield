import "server-only";
import { headers } from "next/headers";

/**
 * The site origin for links we send out (magic links, invites). NEXT_PUBLIC_SITE_URL wins when set,
 * so a spoofed Host header can never redirect a sign-in link; otherwise the request origin is used
 * (local dev and preview deployments).
 */
export async function requestOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

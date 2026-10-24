import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicSupabaseEnv } from "@/lib/supabase/env";
import { createTimeoutFetch } from "@/lib/supabase/fetch";

// Longer than the 10 s data timeout: aborting a token refresh mid-flight could sign a slow user out.
const proxyFetch = createTimeoutFetch(30_000);

/** Refreshes the Supabase session cookie so Server Components always see a valid session. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = publicSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    global: { fetch: proxyFetch },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Validates the token and refreshes it when needed. Nothing may run between creating the client and this call.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    // Everything except static files, images and the public demo (which never needs a session).
    "/((?!_next/static|_next/image|favicon.ico|demo|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

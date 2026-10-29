import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
// Vercel preview deployments inject the Vercel toolbar from vercel.live.
const isPreview = process.env.VERCEL_ENV === "preview";
const toolbar = isPreview ? " https://vercel.live" : "";

/**
 * Everything comes from the site itself: the browser never talks to Supabase or any other host.
 * Scripts need 'unsafe-inline' because pages are pre-rendered (cacheComponents), which rules out a
 * per-request nonce; external scripts and outside connections are still blocked.
 * Development adds what hot reloading needs.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${toolbar}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}${toolbar}`,
  `frame-src ${isPreview ? "https://vercel.live" : "'none'"}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  // No upgrade-insecure-requests: HSTS already forces HTTPS, and the e2e build runs on http://localhost.
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Invite tokens live in the URL; never send them to another site as a referrer.
      { source: "/join/:token", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

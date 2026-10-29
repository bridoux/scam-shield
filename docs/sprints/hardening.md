# Security hardening

Pilot readiness: make abuse expensive, keep an audit trail of record downloads, and tighten what pages are allowed to load.

## Decisions (Eric, 2026-10-29)
- **No CAPTCHA for now.** Sign-in requests are rate-limited per IP address and per email instead; add Cloudflare Turnstile later if bots show up.
- **Invite links:** each link adds at most 25 people and still expires after 14 days; a company can have at most 10 active links.
- **Download log:** owners and admins see recent PDF/CSV downloads on the dashboard (who, format, period, when).
- **Rate-limit counters live in our database** (no new vendor).

## Scope
1. Rate limits (fixed windows, counters in `private.rate_limits`, written only through `hit_rate_limit`, which only the service role can call). Keys are SHA-256 hashes, so no raw IP address or email is stored.
   - Sign-in links: 10 per IP per 15 minutes, 5 per email per hour.
   - Invite links: 20 per person per hour.
   - Record downloads: 30 per person per hour.
   - Starting a round: 30 per person per hour.
   - If the limiter itself fails, requests are allowed and the failure is logged, so an outage never locks people out.
2. Invites: `max_uses` (25) and `uses`; `accept_invite` counts new members only and refuses a full link. A trigger refuses an 11th active link.
3. `record_exports`: one row per PDF/CSV download, written by server code before the file is returned (a download that can't be logged is refused). Owners and admins can read their company's rows. Deleting an account clears its user id, so the row shows "Deleted account".
4. Content Security Policy in production: scripts, styles, images, fonts and connections from the site itself only; forms post only to the site; no frames, plugins or `<base>` changes.
   - A nonce-based policy doesn't work with pre-rendered pages (`cacheComponents`), so scripts allow `'unsafe-inline'` for Next.js's inline bootstrap. External scripts and outside connections are still blocked.

## Privacy policy
Mention the hashed rate-limit counters (kept up to a day) and the download log.

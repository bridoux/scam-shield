# Error alerts

Pilot readiness: when something breaks for a customer, the operator hears about it within minutes instead of from the customer.

## Decisions (Eric, 2026-10-29)
- **Alerts arrive by email through Resend** (free plan: 3,000 emails a month, 100 a day). Until we have our own domain, Resend's shared sender can only email the address the Resend account was opened with, which is all alerts need. The same account will later send sign-in emails and training reminders.
- **Uptime:** a scheduled GitHub Actions job (free, the repo is public) checks the live site every 15 minutes. GitHub emails the operator when it fails.
- **Browser crashes are reported too**, anonymously, to our own server.
- **Timing:** a new error is emailed at once. If it keeps happening, at most one reminder per error per hour, with a count.

## Scope
1. **Error log** (`private.error_events`, written only through `record_error`, which only the service role can call):
   - One row per kind of error, identified by a fingerprint: environment, source, scope and the message with numbers removed.
   - Each row holds a count, first and last seen, and when it was last emailed.
   - The message is scrubbed before it is stored or sent: email addresses, invite tokens, IDs, long tokens and query strings are removed, and it is cut to 300 characters. No user id, IP address or stack trace is stored; stacks stay in Vercel's logs.
   - Rows are deleted 30 days after the error last happened.
2. **What gets reported:**
   - Server errors Next.js sees (pages, server actions, route handlers, proxy), through `onRequestError` in `src/instrumentation.ts`.
   - Errors our own code catches and handles: every `console.error` in actions and loaders becomes `logError(scope, error)`, which still logs and also reports after the response is sent.
   - Browser errors: React error boundaries (`error.tsx`, `global-error.tsx`) and uncaught errors from our own scripts. The browser sends message, kind and page path (no query string) to `/api/client-error`. Network drops ("Failed to fetch"), aborted requests and stale-chunk errors after a deploy are ignored. At most 3 reports per page load and 20 per IP address per hour; refused if another site sends them.
   - Server errors already reported by the server are not reported again from the browser.
3. **Alert emails:**
   - Only from production (`VERCEL_ENV=production`), and only when `RESEND_API_KEY` and `ALERT_EMAIL_TO` are set. Other environments still log and count.
   - Daily email budgets per source, counted in the database: server errors 40, failed health checks 10, browser reports 5 (Resend's free plan allows 100). Anyone can send a browser report, so it can never use up the server's budget.
   - Browser reports are marked UNVERIFIED in the email and their links are replaced with "[link]", so a fake report can't carry a clickable phishing link. At most 100 new kinds of browser error are logged per day; after that they are counted in one overflow row.
   - If the error log itself can't be reached, each server instance still emails each kind of error at most once an hour, and at most 10 emails an hour in all.
   - If Resend refuses an email, the error's hourly slot is released so the next occurrence tries again.
   - Reporting never throws and never delays the visitor: it runs after the response when it can.
4. **Friendly error pages:** "Something went wrong" with Try again and Home, instead of Next.js's bare default page.
5. **Health endpoint** `/api/health`: makes one small database read. It returns 200 `{"status":"ok"}`, or 503 `{"status":"unavailable"}` and reports the failure. It shows no details.
6. **Uptime workflow** `.github/workflows/uptime.yml`, every 15 minutes, can also be run by hand: `/api/health` and the home page must answer within 20 seconds (one retry). GitHub's timing can drift by a few minutes, and it pauses scheduled jobs after 60 days without commits.

## Setup (operator)
1. Create a free Resend account with the email that should receive alerts, then create an API key with "Sending access".
2. Add `RESEND_API_KEY` and `ALERT_EMAIL_TO` to the Vercel project (Production only), then redeploy.
3. On GitHub, keep Actions failure notifications on (Settings → Notifications → Actions).

## Privacy
- The privacy policy and DPA say that error reports are kept for 30 days with identifiers removed.
- Resend is added as a sub-processor (alert emails, technical details only).

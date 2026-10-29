# Scam Shield

A 3-minute daily game that trains staff at small US businesses to spot scams (business email compromise, phishing, fake invoices, voice-clone calls) and gives owners audit-ready training records.

## Product in one paragraph
Employees play one short round a day: 8-10 message cards (email, SMS, voicemail, chat, payment request, calendar invite). They mark each "Legit" or "Scam", get instant feedback with the red flags highlighted on the message, and earn points, streaks and a team league position. Owners see a dashboard and export a training record PDF for the FTC Safeguards Rule, auditors or cyber insurers.

## Target customer
US offices of 10-250 staff that move money or hold customer financial data: auto dealers, tax/CPA firms, mortgage and title, insurance agencies. Sold self-serve and through managed IT providers (MSPs). US first; other countries later as content packs.

## Stack
- Next.js (App Router) + React + TypeScript (strict)
- Tailwind CSS, Framer Motion for card swipes and rewards
- Supabase (US region): Postgres, Auth (magic link), Row Level Security
- Vercel hosting; Stripe Billing (later sprint)
- Vitest for unit tests, Playwright for one smoke test per key flow

## Conventions
- Mobile-first. Design at 375px wide, then scale up.
- Every swipe action also has a visible button and a keyboard shortcut (accessibility).
- All user-facing strings and scenario content carry a `locale` (start with `en-US`). No hard-coded country assumptions in logic.
- Scenario content lives as data (`src/data/scenarios.<locale>.json` is the source of truth; `npm run db:seed` loads it into Supabase), never inside components.
- No real brand names, logos or trademarks in scenario content. Use invented brands ("CloudSuite 365", "SignRight") and `.example` domains only.
  - Government agencies may be named (e.g. the IRS), because impersonating them is the scam being taught.
  - Banks, carriers and every other business stay fictional.
  - Phone numbers use the (555) 01xx range. SMS short codes start with 0 (never issued in the US).
  - Routing numbers must fail the ABA checksum.
- The client never sees an answer before the player commits: cards go out as `PublicCard` (no `id`, `scamType`, `verdict`, `redFlags`, `legitReason`, `tip`), and verdicts come back from the server per answer.
- No third-party analytics or tracking SDKs. Store the minimum personal data.
- Small, focused components. Server components by default; client components only where interaction needs it.
- Run `npm run lint`, `npm run typecheck` and `npm test` before calling a task done. Run `npm run test:db` after any migration or RLS change.

## Local development (Supabase)
- The public `/demo` follows the same rule: the server deals public cards with an encrypted round token (`src/lib/play/demo.ts`), and nothing is saved.
- `.env.local` needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Production also sets `NEXT_PUBLIC_SITE_URL` (used for magic-link and invite URLs). The service role key is server-only (`src/lib/supabase/admin.ts`); never import it into client code.
- Development uses the hosted project (Docker isn't installed for the local Supabase stack). Migrations live in `supabase/migrations/`; apply them to the project, then run `npm run db:types` to regenerate `src/lib/supabase/database.types.ts`.
- Access model: clients only read, through RLS. Company creation and invite acceptance are security-definer functions (`create_organization`, `accept_invite`). Rounds and answers are written only by server code with the service role (`src/lib/play/core.ts`). `scenarios` has no client policies at all.
- Sprint 3 functions:
  - `set_play_days` is owner-only.
  - `weekly_league(week_start)` returns only the caller's own company. It answers only for Mondays, so it can't be used to piece together colleagues' daily activity.
  - Practice rounds never count toward level, streak or league. Any future reporting must filter `is_practice = false` too.
- Sprint 4 functions:
  - `training_report` and `training_topics` are owner/admin-only.
  - They are the only place employee emails are read: from `auth.users`, never copied into app tables.
  - The export routes repeat the role check and send `Cache-Control: private, no-store`.
  - CSV cells are guarded against spreadsheet formulas.
- Member management (`docs/sprints/members.md`):
  - Removing someone sets `memberships.deactivated_at`; the row stays so their past rounds remain on training records ("Left on").
  - Every membership check must ignore deactivated members: the RLS helpers, the play code (service role, so it checks explicitly), league, reports and `accept_invite`. Any new check needs `deactivated_at is null` too.
  - Changes go through `set_member_role` (owner only), `set_member_team`, `set_member_active` and `transfer_ownership`. They lock the rows they change. `src/lib/members.ts` mirrors the rules for the UI only.
  - Teams: clients write only the name; a team can be deleted only with no active members.
- Privacy and deletion (`docs/sprints/privacy.md`):
  - `/privacy`, `/terms` and `/dpa` render `src/data/legal.en-US.json`. They state facts about the app (data collected, who sees it, no analytics, sub-processors Supabase, Vercel, Resend and GitHub, backups gone within 30 days). Update them whenever one of those facts changes, e.g. adding an email provider, analytics or Stripe. `[PLACEHOLDERS]` are highlighted until filled in.
  - `/account` lets anyone signed in delete their account (auth admin delete; foreign keys cascade memberships and rounds). Owners must transfer ownership or delete the company first. `delete_organization` (owner only, exact name) erases the company; members keep their sign-in.
- Hardening (`docs/sprints/hardening.md`):
  - Rate limits live in `src/lib/rate-limit.ts` (`allow(name, subject)`), counted by `hit_rate_limit` (service role only) with HMAC-SHA256 keys (`RATE_LIMIT_SECRET`, falling back to the service role key). Add a limit there for any new endpoint that sends email, creates rows or exports data. The limiter allows requests if it fails itself.
  - Invite links cap at 25 joins (`max_uses`/`uses`), with at most 10 active per company (trigger).
  - Every record download goes through `authorizeDownload` (`src/lib/reports/downloads.ts`), which checks the role, applies the limit and writes `record_exports` first. An unlogged download is refused.
  - The CSP in `next.config.ts` limits sources, connections and forms to the site itself. It allows inline scripts (pre-rendered pages rule out nonces), so it does not stop injected inline script; React's escaping is still the XSS defence. The browser never talks to Supabase. Any new third-party script, font, image host or API must be added to the CSP, and to the privacy policy if it handles personal data.
  - Supabase's default TRUNCATE/TRIGGER/REFERENCES grants are revoked for anon and authenticated, including on future tables.
- Error alerts (`docs/sprints/error-alerts.md`):
  - Never `console.error` a failure: call `logError(scope, error)` from `src/lib/errors/report.ts`. It logs for Vercel and reports after the response. Uncaught server errors reach `reportError` through `onRequestError` in `src/instrumentation.ts`.
  - `private.error_events` holds one row per kind of error (fingerprint), through `record_error` (service role only). Messages and paths are scrubbed first (`src/lib/errors/scrub.ts`): no emails, tokens, ids or query strings. Rows are deleted 30 days after the error last happened.
  - Alert emails go through Resend only from production, when `RESEND_API_KEY` and `ALERT_EMAIL_TO` are set: once for a new error, then at most hourly per error, within daily budgets per source (server 40, health 10, browser 5). Browser reports are untrusted input: they're marked UNVERIFIED and their links removed.
  - Browser crashes are posted to `/api/client-error` (same-origin only, rate-limited, network noise dropped). `/api/health` backs the 15-minute uptime workflow (`.github/workflows/uptime.yml`).
- Backups (`docs/sprints/backups.md`, restore guide `docs/runbooks/restore.md`):
  - `.github/workflows/backup.yml` dumps production nightly, restores the dump into a throwaway local Supabase stack, compares every table's row count, then encrypts it and keeps it 30 days as an artifact.
    - The dump uses the `PRODUCTION_DB_URL` secret of the `production` environment, which only `main` can use.
    - It is encrypted with `ops/backup-public-key.asc`, whose fingerprint is pinned in the workflow. Only the owner holds the private key.
    - The actions are pinned to commit SHAs.
  - The Actions logs are public. Backup scripts print table names and match/mismatch only: no row data, row counts or database errors (only rehearsals show those).
  - Pull requests that touch migrations rehearse the same dump and restore against a local database with `scripts/backup/rehearsal-data.sql`. A migration that can't be restored from a dump fails there. Add rows there for new tables.
- Every Supabase client uses a fetch with a deadline (`src/lib/supabase/fetch.ts`): 10 s for data, 30 s in the proxy. A stalled request then fails visibly instead of leaving a player stuck on "Checking…".
- `npm run test:db` creates throwaway users (`ss-test-…@scam-shield.example`) and deletes them afterwards. The Playwright signed-in tests do the same (`ss-e2e-…`). If the bundled Playwright browser can't be downloaded, set `PLAYWRIGHT_CHANNEL=msedge` to use the installed Edge.
- Tests never run against production. `test:db` and `test:e2e` read the test project's keys from `.env.test.local` (same three variables as `.env.local`), and `tests/guard.ts` refuses to start if the URL points at the production project. After a migration, apply it to the test project too and run `npm run db:seed:test` when cards change.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck and unit tests, then the db and e2e tests against the test project. Its keys are repository secrets with the same names as in `.env.test.local`; refresh them with `gh secret set -f .env.test.local`.

## Scenario card schema
```ts
type Channel = "email" | "sms" | "voicemail" | "chat" | "payment_request" | "calendar_invite";
type Verdict = "legit" | "scam";

interface RedFlag {
  id: string;
  label: string;        // short name, e.g. "Lookalike domain"
  explanation: string;  // one sentence
  target: string;       // exact substring in the message body/header to highlight
}

interface Scenario {
  id: string;
  locale: "en-US";
  channel: Channel;
  industry: "general" | "auto_dealer" | "tax_cpa" | "mortgage_title" | "insurance";
  scamType: string;     // e.g. "wire_change", "gift_card", "credential_phish", "none"
  difficulty: 1 | 2 | 3 | 4 | 5;
  verdict: Verdict;
  sender: { name: string; address: string };  // email address, phone number, or handle
  subject?: string;
  body: string;
  links?: { text: string; url: string }[]; // text: exact substring of body; url: real destination shown in the link preview
  redFlags: RedFlag[];  // empty for legit cards
  legitReason?: string; // for legit cards: why it's safe
  tip: string;          // one-line takeaway
}
```

## Sprint workflow
Work one sprint at a time from `docs/sprints/`. For each sprint: read the sprint file, propose a short plan, then build. Finish with a summary of what shipped, what's left, and anything that needs a decision.

## Sprint roadmap
1. Playable daily round with seed data (no backend) — demo for buyer calls
2. Supabase: schema, auth, companies/teams, scenarios moved to the database
3. Scoring, streaks, levels, adaptive card selection, team league
4. Owner dashboard, training record PDF, CSV export
5. Onboarding, invites, Stripe billing
6. PWA, security hardening, polish, pilot readiness

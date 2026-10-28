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
- Every Supabase client uses a fetch with a deadline (`src/lib/supabase/fetch.ts`): 10 s for data, 30 s in the proxy. A stalled request then fails visibly instead of leaving a player stuck on "Checking…".
- `npm run test:db` creates throwaway users (`ss-test-…@scam-shield.example`) and deletes them afterwards. The Playwright signed-in tests do the same (`ss-e2e-…`). If the bundled Playwright browser can't be downloaded, set `PLAYWRIGHT_CHANNEL=msedge` to use the installed Edge.
- Tests never run against production. `test:db` and `test:e2e` read the test project's keys from `.env.test.local` (same three variables as `.env.local`), and `tests/guard.ts` refuses to start if the URL points at the production project. After a migration, apply it to the test project too and run `npm run db:seed:test` when cards change.

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

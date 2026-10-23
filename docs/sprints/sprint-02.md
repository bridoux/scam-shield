# Sprint 2 — Supabase, accounts and companies

## Goal
Move Scam Shield from a static demo to a real multi-company app: people sign in, belong to a company and team, play rounds served from the database, and their results are saved. Keep a public demo for buyer calls.

## Before you start (Eric)
- Merge `claude/sprint-01` into `main` once you've played it.
- Import the repo in Vercel yourself (Add New → Project), so every branch push gets a preview URL.
- Create a Supabase project in a US region. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to Vercel (Preview + Production) and to `.env.local`.

## Decisions from Sprint 1
- **Brand names stay fictional.** Keep "CloudSuite 365" and "SignRight". Add this to the conventions in CLAUDE.md: no real brand names, logos or trademarks in scenario content.
- **Flagged scenarios stay**, with the fixes below. `trade-payoff-change-lakeshore` is difficulty 5 by design.
- **Content volume is a priority.** 24 cards is too few; this sprint grows the library to 60.

## Done means
- A visitor can sign up with a magic link, create a company (becoming its owner), name a team, and share an invite link. Anyone opening the invite link signs in and joins that company as a player.
- Signed-in players play a daily round served from the database. Each answer and the round result are saved.
- **Answers are checked on the server.** The client receives cards without `verdict`, `redFlags`, `legitReason` or `tip`; it submits an answer and gets the feedback back. Points and streaks are computed on the server.
- One round per player per day counts toward their record; extra rounds are allowed as practice and marked as such.
- `/demo` still works with no login, using the approved scenarios, exactly like Sprint 1 (no saving).
- Row Level Security on every table. A test proves a user in company A cannot read or write anything in company B.
- 60 approved scenarios in the database, all passing the existing content checks.

## Tasks
1. **Supabase setup.** Supabase CLI for local dev, migrations in `supabase/migrations/`, generated TypeScript types committed. Server and browser clients via `@supabase/ssr`. Add `CLAUDE.md` notes on how to run locally.
2. **Schema** (adjust names if you find a better fit, and explain why):
   - `organizations` (id, name, industry, created_at)
   - `teams` (id, organization_id, name)
   - `memberships` (user_id, organization_id, team_id, role: owner | admin | player, display_name)
   - `invites` (token, organization_id, team_id, role, expires_at, created_by)
   - `scenarios` (all fields from the schema in CLAUDE.md; `red_flags` as jsonb; `status`: draft | approved | retired)
   - `rounds` (id, user_id, organization_id, started_at, completed_at, is_practice, score, points, best_streak)
   - `round_answers` (round_id, scenario_id, position, answer, is_correct, answered_at)
3. **RLS policies.** Members read their own organization, teams and memberships. Owners/admins manage invites and teams. Players insert answers only for their own open rounds. Approved scenarios readable by signed-in users; no client write access to scenarios.
4. **Seed and import.** A script that validates `scenarios.en-US.json` with the existing content checks and upserts it into `scenarios`. Keep the JSON as the source of truth for now.
5. **Auth and onboarding.** Magic link sign-in; "create your company" flow for first-time users; invite link join flow; simple sign-out. Copyable invite link only (no email sending yet).
6. **Server-checked play.** Server actions or route handlers: start round (pick 10 cards with the existing selection logic), submit answer (returns verdict, red flags, explanation, tip), finish round (saves score, points, best streak). Reuse the Sprint 1 pure functions; keep them tested.
7. **Content fixes.**
   - Links in email and SMS cards: tap-and-hold (or tap on desktop) opens a "link preview" showing the real destination URL. This teaches a real habit and fixes the long-URL problem in `esign-phish-engagement-letter`.
   - For lookalike-domain cards, make sure the genuine domain appears somewhere the player can compare against.
8. **Content batch.** Add 36 new scenarios (total 60): at least 8 more auto dealer, 8 more tax/CPA, 6 mortgage/title, 6 insurance, the rest general. Keep about 60% scams. Flag any you're unsure are realistic.
9. **Tests.** RLS isolation test (two users, two companies). Server-check test (a client can't get the verdict before answering). Update Playwright: sign-in via a test helper, play a full round, see saved results; keep the `/demo` smoke test.
10. **Fix:** the start-screen race where early arrow-key presses are ignored. Disable the answer controls until the round UI is mounted, then enable them.

## Out of scope
League tables, levels and adaptive selection (Sprint 3), owner dashboard and PDF (Sprint 4), email invites and Stripe (Sprint 5).

## Finish with
A summary of what shipped, the preview URL, any schema changes from the plan above and why, and any scenarios that need review.

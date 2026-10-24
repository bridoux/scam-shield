# Scam Shield

A 3-minute daily game that trains staff at small US businesses to spot scams. See `CLAUDE.md` for the product brief and `docs/sprints/` for the roadmap.

## What's here (Sprint 2)

- **`/demo`**: the public demo for buyer calls. No sign-in, nothing saved, same as Sprint 1.
- **`/`**: signed-out visitors see a welcome page. Signed-in players get today's round, served and checked by the server.
- **`/sign-in`**: magic-link sign-in.
- **`/onboarding`**: a first-time user creates their company and becomes its owner.
- **`/team`**: owners and admins create invite links. Everyone sees the member list.
- **`/join/<token>`**: an invite link. The person signs in and joins as a player.

One round per player per day counts toward their record, using the company's time zone. Extra rounds are saved as practice.

## Develop

Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. In production, also set:
- `NEXT_PUBLIC_SITE_URL`, the canonical origin used in magic links and invite links.
- `DEMO_SECRET` (optional), which encrypts demo round tokens. It falls back to the service role key.

If Playwright can't download its own browser, run `PLAYWRIGHT_CHANNEL=msedge npm run test:e2e` to use the installed Edge.

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm test             # Vitest unit tests: round engine, highlighting, links, content rules
npm run test:db      # Integration tests against Supabase: RLS isolation, server-checked play
npm run test:e2e     # Playwright: demo flows + signed-in flows (builds and starts the app on :3100)
npm run db:seed      # Content checks, then upsert scenarios into Supabase as "approved"
npm run db:types     # Regenerate src/lib/supabase/database.types.ts
```

## Where things live

| Path | What |
| --- | --- |
| `src/data/scenarios.en-US.json` | All 60 scenario cards. This is the source of truth; `db:seed` loads it into Supabase |
| `src/data/ui.en-US.json` | All UI strings for `en-US` |
| `supabase/migrations/` | Schema, RLS policies and onboarding functions |
| `src/lib/round.ts` | Pure round engine: card selection, scoring, streaks, summary |
| `src/lib/play/core.ts` | Server-checked play: start/resume, answer, finish (service role) |
| `src/app/actions/` | Server actions for play, auth and company/invites |
| `src/lib/highlight.ts` | Maps red flags and links to card fields and splits text for rendering |
| `src/components/cards/` | One renderer per channel, plus `CardView` and the link preview |
| `src/components/game/` | `DemoGame` (local) and `LiveGame` (server) wrappers around `Game` |
| `tests/db/` | Supabase integration tests |
| `e2e/` | Playwright tests |

`src/data/scenarios.test.ts` enforces the content rules:
- Every red-flag `target` is an exact, non-overlapping substring of the card.
- Every link's `text` appears in the body, and a link either exactly matches a red flag or doesn't overlap one.
- Raw URLs in a body stay short.
- Scam and legit fields are consistent.
- The mix is about 60% scam, 40% legit, with minimum counts per industry.
- Only fictional `.example` domains appear.

Run `npm test` after editing scenarios.

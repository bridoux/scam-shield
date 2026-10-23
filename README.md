# Scam Shield

A 3-minute daily game that trains staff at small US businesses to spot scams. See `CLAUDE.md` for the product brief and `docs/sprints/` for the roadmap.

## Sprint 1: playable demo round

No backend and no login. Open the site, start a round of 10 cards, and mark each card Legit or Scam by swiping, tapping, or pressing ← / →.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm test             # Vitest: round engine, highlighting, scenario content rules
npm run test:e2e     # Playwright smoke test (builds and starts the app on :3100)
```

## Where things live

| Path | What |
| --- | --- |
| `src/data/scenarios.en-US.json` | All 24 scenario cards (content only, ready to move to Supabase) |
| `src/data/ui.en-US.json` | All UI strings for `en-US` |
| `src/lib/round.ts` | Pure round engine: card selection, scoring, streaks, summary |
| `src/lib/highlight.ts` | Maps red-flag targets to card fields and splits text for highlighting |
| `src/components/cards/` | One renderer per channel plus `CardView` |
| `src/components/` | Start, play, feedback and end screens; `SwipeCard` handles drag |

`src/data/scenarios.test.ts` enforces the content rules. Every red-flag `target` must be an exact, non-overlapping substring of the card. Scam and legit fields must be consistent, the scam/legit mix must be about 60/40, and only fictional `.example` domains may appear. Run `npm test` after editing scenarios.

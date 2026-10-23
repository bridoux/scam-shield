# Sprint 1 — Playable daily round (demo)

## Goal
A polished, phone-friendly demo of one daily round that Eric can open during buyer calls. No backend, no login. Deployed to Vercel.

## Done means
- Opening the site on a phone shows a start screen, then a round of 10 cards.
- Each card looks like the real thing (an email client, an SMS thread, a voicemail with transcript, a chat message, a payment request, a calendar invite).
- The player swipes right for "Legit", left for "Scam", or taps the buttons. Keyboard: Left arrow = Scam, Right arrow = Legit.
- After each answer: correct/incorrect feedback, red flags highlighted on the message itself with a short explanation for each, then a one-line tip, then "Next".
- End screen: score, accuracy, points with a streak bonus, and a breakdown of which scam types were missed.
- "Play again" shuffles a new round.
- Lighthouse mobile performance and accessibility both 90+.

## Tasks
1. Scaffold the project: Next.js (App Router), TypeScript strict, Tailwind, Framer Motion, ESLint, Vitest. Add `typecheck` and `test` npm scripts.
2. Create `src/data/scenarios.en-US.json` with 24 scenarios following the schema in CLAUDE.md:
   - About 60% scams, 40% legit (legit cards must be realistic, not obviously safe).
   - Cover: changed wire instructions, CEO gift card request, fake vendor invoice, Microsoft 365 login phish, DocuSign phish, unpaid toll text, package delivery text, IRS/W-2 request, voice-clone "boss" voicemail, MFA code callback scam, plus legit equivalents (real vendor invoice, real IT notice, real calendar invite).
   - Include at least 4 cards each for the auto dealer and tax/CPA industries.
   - Every red flag's `target` must be an exact substring of the card so it can be highlighted.
   - Use fictional company names and domains only (e.g. use `.example` or clearly invented brands). Never use real company logos or real people.
3. Build the round engine as pure functions in `src/lib/round.ts`: pick 10 cards with a mix of channels and difficulties, score answers, compute streak bonus (+10 per correct, +5 streak bonus from the 3rd correct in a row). Unit-test it.
4. Build one card renderer per channel in `src/components/cards/`, plus a shared `Highlight` component that wraps red-flag targets in a marked span.
5. Build the swipe interaction with Framer Motion (drag threshold, tilt, colored overlay for Legit/Scam), with buttons and keyboard as equal alternatives.
6. Build start, feedback and end screens. Clean, trustworthy look: neutral palette, one accent color, no cartoon clutter.
7. Add a Playwright smoke test: start a round, answer all 10 cards with buttons, see the end screen.
8. Deploy to Vercel and share the preview URL.

## Out of scope
Login, database, saving scores, dashboard, payments, PWA install.

## Notes
- Keep all scenario text in the JSON file so later sprints can move it to Supabase unchanged.
- Flag any scenario you're unsure is realistic so Eric can review it.

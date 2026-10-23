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
- Scenario content lives as data (JSON now, Supabase later), never inside components.
- No third-party analytics or tracking SDKs. Store the minimum personal data.
- Small, focused components. Server components by default; client components only where interaction needs it.
- Run `npm run lint`, `npm run typecheck` and `npm test` before calling a task done.

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

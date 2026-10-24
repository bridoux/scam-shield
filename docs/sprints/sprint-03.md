# Sprint 3: Streaks, levels, adaptive rounds and the team league

## Goal
Give players reasons to come back every workday, and make each round teach what that person most needs. Players see their streak and level. Every company gets a weekly league for players and teams.

## Decisions (Eric, 2026-10-24)
- **Play days are set by the company owner.** Owners pick which weekdays count, for example Mon–Fri for a CPA firm or Mon–Sat for a dealership. The default is Mon–Fri. A streak only breaks on a required day with no completed record round. Rounds on other days still earn points and count in the league, but they don't extend the streak.
- **League: players and teams.** Each company has two weekly boards:
  - players, ranked by weekly points;
  - teams, ranked by average weekly points per member, so a 3-person team can beat a 12-person team.

  The week starts Monday in the company's time zone. Practice rounds never count.
- **Levels: named tiers by lifetime record points.** Practice rounds don't count.
- **Content: add 40 cards (100 total).** Adaptive selection and the no-repeat rule need a bigger pool.

## Done means
- The start screen shows the player's level with progress to the next one, their streak (counted in required days), and today's status.
- The end screen shows points added to their level, the updated streak, and their position in this week's league.
- `/league` shows this week's player and team boards for the player's company, with a switch to last week. The player's own row and team are highlighted. No other company's data is reachable (RLS or function-scoped).
- Owners set their company's play days on `/team`. Admins and players see them read-only.
- Rounds adapt to each player:
  - no card repeats within 30 days while unseen cards remain;
  - scam types the player misses come up more often;
  - difficulty follows recent accuracy;
  - cards from the company's industry are preferred, mixed with general ones;
  - the Sprint 1 rules still hold: about 60/40 scam/legit and a spread of channels.
- 100 approved scenarios, all passing the content checks.

## Tasks
1. **Migration.**
   - Add `organizations.play_days`: ISO weekdays 1–7, non-empty, default Mon–Fri.
   - Add an owner-only `set_play_days` RPC.
   - Add a security-definer `weekly_league(week_start)` function that returns only the caller's company members, with their weekly record points and rounds.
2. **Pure logic** (unit-tested):
   - `streak.ts`: current and best streak from completed record-round dates, the company's play days and today.
   - `levels.ts`: tiers, current level and progress.
   - `adaptive.ts`: a player profile (seen cards, miss rate by scam type, recent accuracy) and weighted candidate selection feeding the existing `pickRound`.
   - `league.ts`: player and team rankings from the function's rows.
3. **Play.** `startRound` builds the player's profile and uses adaptive selection. `finishRound` returns the level, streak and league position.
4. **UI:**
   - live start screen: level badge with a progress bar, and the streak;
   - end screen: level progress gained, streak, league rank;
   - the `/league` page;
   - a play-days editor on `/team` (owner);
   - a "League" link in the account menu.
5. **Content.** Add 40 scenarios: at least 6 each for auto dealer, tax/CPA, mortgage/title and insurance, the rest general. Keep about 60% scams. Flag any whose realism is uncertain.
6. **Tests:**
   - Unit tests for streaks, levels, adaptive picking and league ranking.
   - DB tests:
     - the league function never returns another company's members;
     - only the owner can change play days;
     - practice rounds don't count.
   - e2e: play a round, then see yourself on `/league`; an owner changes play days.

## Out of scope
Owner dashboard, training-record PDF and CSV export (Sprint 4); email invites and billing (Sprint 5); cross-company leagues.

## Finish with
A summary of what shipped, schema changes and why, and the scenarios that need review.

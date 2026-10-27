import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { Panel, Shell } from "@/components/ui/Shell";
import { getSession } from "@/lib/auth";
import { format, getStrings } from "@/lib/content";
import { localDate } from "@/lib/play/dates";
import { addDays, weekStart } from "@/lib/progress/calendar";
import { rankPlayers, rankTeams } from "@/lib/progress/league";
import { loadLeague } from "@/lib/progress/load";
import { createClient } from "@/lib/supabase/server";

const strings = getStrings("en-US");
const l = strings.league;

export const metadata: Metadata = { title: `${strings.appName} · ${l.title}` };

export default function LeaguePage({ searchParams }: PageProps<"/league">) {
  return (
    <Suspense fallback={<Shell appName={strings.appName}>{null}</Shell>}>
      <LeagueContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LeagueContent({ searchParams }: Pick<PageProps<"/league">, "searchParams">) {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/league");
  const member = session.member;
  if (!member) redirect("/onboarding");

  const lastWeek = (await searchParams).week === "last";
  const thisMonday = weekStart(localDate(new Date(), member.timeZone));
  const start = lastWeek ? addDays(thisMonday, -7) : thisMonday;
  const rows = await loadLeague(await createClient(), start);
  const players = rankPlayers(rows);
  const teams = rankTeams(rows);
  const dayFormat = new Intl.DateTimeFormat(strings.locale, { month: "short", day: "numeric", timeZone: "UTC" });
  const label = (day: string) => dayFormat.format(new Date(`${day}T00:00:00Z`));
  const anyRounds = players.some((p) => p.rounds > 0);

  return (
    <Shell appName={strings.appName} accessory={<AccountMenu member={member} strings={strings} />}>
      <Link href="/" className="mt-8 text-sm font-semibold text-accent hover:underline">
        ← {l.back}
      </Link>
      <h1 className="mt-3 text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">{l.title}</h1>
      <p className="mt-1 text-sm text-slate-700">{format(l.intro, { start: label(start), end: label(addDays(start, 6)) })}</p>

      <nav aria-label={l.title} className="mt-4 inline-flex rounded-full bg-slate-200 p-1 text-sm font-semibold">
        <WeekTab href="/league" active={!lastWeek}>
          {l.thisWeek}
        </WeekTab>
        <WeekTab href="/league?week=last" active={lastWeek}>
          {l.lastWeek}
        </WeekTab>
      </nav>

      <Panel className="mt-5">
        <h2 className="text-lg font-semibold text-slate-900">{l.players}</h2>
        {!anyRounds ? <p className="mt-1 text-sm text-slate-600">{l.empty}</p> : null}
        <ol className="mt-2 divide-y divide-slate-200" data-testid="league-players">
          {players.map((p) => {
            const me = p.userId === member.userId;
            return (
              <li
                key={p.userId}
                aria-current={me ? "true" : undefined}
                className={`flex items-center gap-3 py-2.5 ${me ? "-mx-2 rounded-lg bg-accent-soft px-2" : ""}`}
              >
                <span className="w-7 shrink-0 text-center font-bold text-slate-500 tabular-nums">{p.rank}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900">
                    {p.displayName}
                    {me ? <span className="ml-1.5 text-xs font-semibold text-accent">({l.you})</span> : null}
                  </span>
                  <span className="block text-xs text-slate-600">
                    {p.teamName ? `${p.teamName} · ` : ""}
                    {format(l.rounds, { count: p.rounds })}
                  </span>
                </span>
                <span className="shrink-0 font-bold text-slate-900 tabular-nums">{format(l.points, { points: p.points })}</span>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel className="mt-5">
        <h2 className="text-lg font-semibold text-slate-900">{l.teams}</h2>
        <p className="mt-1 text-sm text-slate-600">{l.teamsNote}</p>
        {teams.length === 0 ? <p className="mt-2 text-sm text-slate-600">{l.noTeams}</p> : null}
        <ol className="mt-2 divide-y divide-slate-200" data-testid="league-teams">
          {teams.map((t) => {
            const mine = t.teamId === member.teamId;
            return (
              <li
                key={t.teamId}
                aria-current={mine ? "true" : undefined}
                className={`flex items-center gap-3 py-2.5 ${mine ? "-mx-2 rounded-lg bg-accent-soft px-2" : ""}`}
              >
                <span className="w-7 shrink-0 text-center font-bold text-slate-500 tabular-nums">{t.rank}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900">
                    {t.teamName}
                    {mine ? <span className="ml-1.5 text-xs font-semibold text-accent">({l.yourTeam})</span> : null}
                  </span>
                  <span className="block text-xs text-slate-600">
                    {format(l.members, { count: t.members })} · {format(l.points, { points: t.points })}
                  </span>
                </span>
                <span className="shrink-0 font-bold text-slate-900 tabular-nums">{format(l.average, { average: t.average })}</span>
              </li>
            );
          })}
        </ol>
      </Panel>
    </Shell>
  );
}

function WeekTab({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-4 py-1.5 ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
    >
      {children}
    </Link>
  );
}

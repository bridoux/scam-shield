import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { Notice, Panel, Shell } from "@/components/ui/Shell";
import { format, getStrings, scamTypeLabel } from "@/lib/content";
import { loadTrainingRecord } from "@/lib/reports/load";
import { periodQuery, type Period, type PeriodPreset } from "@/lib/reports/period";
import {
  MIN_TOPIC_ATTEMPTS,
  percent,
  weakestTopics,
  type EmployeeRecord,
  type RecordStatus,
  type TopicRecord,
  type TrainingRecord,
} from "@/lib/reports/record";

const strings = getStrings("en-US");
const d = strings.dashboard;

export const metadata: Metadata = { title: `${strings.appName} · ${d.title}` };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<Shell appName={strings.appName} wide>{null}</Shell>}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const params = await searchParams;
  const access = await loadTrainingRecord({ range: params.range, from: params.from, to: params.to });
  if (!access.ok && access.reason === "signed_out") redirect("/sign-in?next=/dashboard");
  if (!access.ok && access.reason === "no_company") redirect("/onboarding");
  if (!access.ok) {
    return (
      <Shell appName={strings.appName}>
        <div className="mt-10">
          <Notice tone="info">{d.ownersOnly}</Notice>
        </div>
      </Shell>
    );
  }

  const { member, record } = access;
  const query = periodQuery(record.period);
  return (
    <Shell appName={strings.appName} wide accessory={<AccountMenu member={member} strings={strings} />}>
      <Link href="/" className="mt-8 text-sm font-semibold text-accent hover:underline">
        ← {d.back}
      </Link>
      <h1 className="mt-3 text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">{d.title}</h1>
      <p className="mt-1 text-sm text-slate-700">{format(d.intro, { company: member.organizationName })}</p>

      <PeriodPicker period={record.period} />

      <div className="mt-5 flex flex-wrap items-center gap-3" data-testid="downloads">
        <a
          href={`/dashboard/record.pdf?${query}`}
          download
          className="inline-flex items-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {d.downloadPdf}
        </a>
        <a
          href={`/dashboard/record.csv?${query}`}
          download
          className="inline-flex items-center rounded-xl border-2 border-accent bg-white px-4 py-2 text-sm font-semibold text-accent hover:bg-accent-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {d.downloadCsv}
        </a>
        <p className="w-full text-xs text-slate-600 md:w-auto">{d.downloadsNote}</p>
      </div>

      <Summary record={record} />
      <Employees employees={record.employees} />
      <Topics record={record} />
    </Shell>
  );
}

const PRESETS: Exclude<PeriodPreset, "custom">[] = ["30d", "90d", "12m"];

function dayLabel(day: string): string {
  return new Intl.DateTimeFormat(strings.locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
}

function PeriodPicker({ period }: { period: Period }) {
  return (
    <section aria-label={d.period} className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <Link
            key={preset}
            href={`/dashboard?range=${preset}`}
            aria-current={period.preset === preset ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${period.preset === preset ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"}`}
          >
            {d.presets[preset]}
          </Link>
        ))}
        <span className="text-sm text-slate-600" data-testid="period-range">
          {format(d.range, { from: dayLabel(period.from), to: dayLabel(period.to) })}
        </span>
      </div>
      <form method="get" action="/dashboard" className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs font-semibold text-slate-700">
          {d.from}
          <input type="date" name="from" defaultValue={period.from} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm" />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          {d.to}
          <input type="date" name="to" defaultValue={period.to} className="mt-1 block rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50">
          {d.apply}
        </button>
      </form>
    </section>
  );
}

function Summary({ record }: { record: TrainingRecord }) {
  const s = record.summary;
  const stats: [string, string, string?][] = [
    [d.employees, String(s.employees)],
    [d.onTrack, String(s.onTrack), "text-safe"],
    [d.behind, String(s.behind), s.behind > 0 ? "text-danger" : undefined],
    [d.new, String(s.new)],
    [d.avgCompletion, s.avgCompletion === null ? "—" : `${percent(s.avgCompletion)}%`],
    [d.avgAccuracy, s.avgAccuracy === null ? "—" : `${percent(s.avgAccuracy)}%`],
    [d.rounds, String(s.rounds)],
  ];
  return (
    <dl className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7" data-testid="summary">
      {stats.map(([label, value, tone]) => (
        <div key={label} className="rounded-xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-200">
          <dt className="text-xs font-medium text-slate-600">{label}</dt>
          <dd className={`mt-0.5 text-2xl font-bold tabular-nums ${tone ?? "text-slate-900"}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const STATUS_STYLE: Record<RecordStatus, string> = {
  on_track: "bg-safe-soft text-safe",
  behind: "bg-danger-soft text-danger",
  new: "bg-slate-100 text-slate-700",
};

function Employees({ employees }: { employees: EmployeeRecord[] }) {
  return (
    <Panel className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">{d.tableHeading}</h2>
      <p className="mt-1 text-xs text-slate-600">{d.targetNote}</p>
      <div className="mt-3 hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-600 md:grid">
        <span>{d.colEmployee}</span>
        <span>{d.colDays}</span>
        <span>{d.colCompletion}</span>
        <span>{d.colAccuracy}</span>
        <span>{d.colLastPlayed}</span>
        <span>{d.colStatus}</span>
      </div>
      <ul className="divide-y divide-slate-200" data-testid="employee-list">
        {employees.map((e) => (
          <li key={e.userId} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 py-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] md:items-center">
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-900">{e.displayName}</span>
              <span className="block truncate text-xs text-slate-600">{e.teamName ?? d.noTeam}</span>
            </span>
            <span className="order-last col-span-2 text-xs text-slate-600 md:order-none md:col-span-1 md:text-sm md:text-slate-800">
              {format(d.daysValue, { done: e.completedDays, required: e.requiredDays })}
              <span className="md:hidden">
                {" · "}
                {d.colAccuracy} {e.accuracy === null ? "—" : `${percent(e.accuracy)}%`}
                {" · "}
                {d.colLastPlayed} {e.lastPlayed ? dayLabel(e.lastPlayed) : d.never}
              </span>
            </span>
            <span className="hidden font-semibold text-slate-900 tabular-nums md:block">
              {e.completion === null ? "—" : `${percent(e.completion)}%`}
            </span>
            <span className="hidden text-slate-800 tabular-nums md:block">{e.accuracy === null ? "—" : `${percent(e.accuracy)}%`}</span>
            <span className="hidden text-sm text-slate-800 md:block">{e.lastPlayed ? dayLabel(e.lastPlayed) : d.never}</span>
            <span className={`col-start-2 row-start-1 inline-flex h-fit justify-self-end rounded-full px-2.5 py-0.5 text-xs font-semibold md:col-start-6 ${STATUS_STYLE[e.status]}`}>
              <span className="md:hidden">{e.completion === null ? "" : `${percent(e.completion)}% · `}</span>
              {d.status[e.status]}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function TopicList({ topics, testId }: { topics: TopicRecord[]; testId?: string }) {
  return (
    <ul className="mt-3 space-y-3" data-testid={testId}>
      {topics.map((t) => {
        const label = t.scamType === "none" ? strings.record.legitTopic : scamTypeLabel(strings, t.scamType);
        const pct = Math.round(t.accuracy * 100);
        return (
          <li key={t.scamType}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-slate-900">{label}</span>
              <span className="shrink-0 text-xs text-slate-600">{format(d.topicValue, { accuracy: pct, attempts: t.attempts })}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden>
              <div className={`h-full rounded-full ${pct < 70 ? "bg-danger" : "bg-safe"}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Topics({ record }: { record: TrainingRecord }) {
  const weakest = weakestTopics(record.topics);
  return (
    <Panel className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">{d.topicsHeading}</h2>
      <p className="mt-1 text-xs text-slate-600">{format(d.topicsIntro, { min: MIN_TOPIC_ATTEMPTS })}</p>
      {record.topics.length === 0 ? <p className="mt-3 text-sm text-slate-600">{d.topicsEmpty}</p> : null}
      {record.topics.length > 0 && weakest.length === 0 ? <p className="mt-3 text-sm text-slate-600">{d.topicsTooFew}</p> : null}
      <TopicList topics={weakest} testId="topics" />
      {record.topics.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-accent hover:underline">
            {format(d.allTopics, { count: record.topics.length })}
          </summary>
          <TopicList topics={record.topics} />
        </details>
      ) : null}
    </Panel>
  );
}

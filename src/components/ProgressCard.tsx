import Link from "next/link";
import { format, type UiStrings } from "@/lib/content";
import type { PlayerProgress } from "@/lib/play/types";
import { LEVELS } from "@/lib/progress/levels";
import { FlameIcon, ShieldIcon } from "./icons";

interface ProgressCardProps {
  strings: UiStrings;
  progress: PlayerProgress;
  /** Points this round added to the level, shown on the end screen. */
  earned?: number;
}

/** Level with progress to the next one, the streak in required days, and this week's league position. */
export function ProgressCard({ strings, progress, earned }: ProgressCardProps) {
  const p = strings.progress;
  const { level, streak, league } = progress;
  const levelName = strings.levels[level.key];
  const nextLevel = LEVELS[level.number];
  const streakNote = streak.playedToday
    ? p.streakTodayDone
    : streak.todayRequired
      ? p.streakTodayDue
      : p.streakDayOff;

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200" data-testid="progress-card">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent"
        >
          <ShieldIcon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900" data-testid="level">
            {format(p.level, { number: level.number, name: levelName })}
          </p>
          <p className="text-xs text-slate-600">
            {nextLevel && level.next !== null
              ? format(p.toNext, { points: level.next - level.points, name: strings.levels[nextLevel.key] })
              : p.maxLevel}
            {" · "}
            {format(p.lifetime, { points: level.points })}
          </p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={format(p.level, { number: level.number, name: levelName })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level.progress * 100)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(level.progress * 100)}%` }} />
      </div>
      {earned !== undefined && earned > 0 ? (
        <p className="mt-2 text-sm font-semibold text-safe">{format(p.earned, { points: earned })}</p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="sr-only">{p.streakHint}</dt>
          <dd className="flex items-center gap-1.5 font-semibold text-slate-900" data-testid="streak" title={p.streakHint}>
            <FlameIcon className={`size-4 ${streak.current > 0 ? "text-amber-600" : "text-slate-400"}`} />
            {streak.current > 0 ? format(p.streak, { count: streak.current }) : p.streakNone}
          </dd>
          <dd className="mt-0.5 text-xs text-slate-600">{streakNote}</dd>
        </div>
        <div>
          <dt className="sr-only">{strings.league.title}</dt>
          <dd className="font-semibold text-slate-900" data-testid="league-rank">
            {league ? format(p.leagueRank, { rank: league.rank, players: league.players }) : "—"}
          </dd>
          <dd className="mt-0.5 text-xs">
            <Link href="/league" className="font-semibold text-accent hover:underline">
              {p.leagueLink}
            </Link>
          </dd>
        </div>
      </dl>
    </section>
  );
}

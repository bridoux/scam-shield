import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { LiveGame } from "@/components/game/LiveGame";
import { RoundLoading } from "@/components/RoundLoading";
import { Shell } from "@/components/ui/Shell";
import { getSession, type Member } from "@/lib/auth";
import { format, getStrings } from "@/lib/content";
import { localDate } from "@/lib/play/dates";
import { loadProgress } from "@/lib/progress/load";
import { createClient } from "@/lib/supabase/server";

const strings = getStrings("en-US");

export default function Home() {
  return (
    <Suspense fallback={<RoundLoading strings={strings} />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const session = await getSession();
  if (!session) return <Welcome />;
  if (!session.member) redirect("/onboarding");
  const member = session.member;
  const client = await createClient();
  const [today, progress] = await Promise.all([todaysRecord(member), loadProgress(client, member)]);

  const s = strings.start;
  let note = s.recordNote;
  let cta: string | undefined;
  if (today?.completed) {
    const { score, total, points } = today;
    note = `${format(strings.home.todayDone, { score, total, points })} ${s.practiceNote}`;
    cta = strings.end.practiceAgain;
  } else if (today) {
    cta = s.resumeCta;
  }

  return (
    <LiveGame
      strings={strings}
      startNote={note}
      startCta={cta}
      accessory={<AccountMenu member={member} strings={strings} />}
      progress={progress}
    />
  );
}

/** Today's record round (not practice), read through RLS as the player. */
async function todaysRecord(member: Member) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rounds")
    .select("completed_at, score, points, card_count")
    .eq("user_id", member.userId)
    .eq("round_date", localDate(new Date(), member.timeZone))
    .eq("is_practice", false)
    .maybeSingle();
  if (error) throw new Error(`Loading today's round failed: ${error.message}`);
  if (!data) return null;
  return {
    completed: data.completed_at !== null,
    score: data.score ?? 0,
    total: data.card_count,
    points: data.points ?? 0,
  };
}

function Welcome() {
  const h = strings.home;
  return (
    <Shell appName={strings.appName}>
      <div className="mt-12">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">{h.eyebrow}</p>
        <h1 className="mt-2 text-[2rem] leading-tight font-bold tracking-tight text-slate-900">{h.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-700">{h.intro}</p>
      </div>
      <div className="mt-auto space-y-3 pt-12">
        <Link
          href="/sign-in"
          className="flex w-full items-center justify-center rounded-xl bg-accent px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {h.signIn}
        </Link>
        <Link
          href="/demo"
          className="flex w-full items-center justify-center rounded-xl border-2 border-accent bg-white px-6 py-3.5 text-lg font-semibold text-accent transition-colors hover:bg-accent-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {h.tryDemo}
        </Link>
      </div>
    </Shell>
  );
}

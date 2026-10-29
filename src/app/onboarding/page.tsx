import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Notice, Shell } from "@/components/ui/Shell";
import { getSession } from "@/lib/auth";
import { getStrings } from "@/lib/content";
import { nameFromEmail } from "@/lib/urls";
import { OnboardingForm } from "./OnboardingForm";

const strings = getStrings("en-US");

export const metadata: Metadata = { title: `${strings.appName} · ${strings.onboarding.title}` };

export default function OnboardingPage() {
  return (
    <Shell appName={strings.appName}>
      <Suspense>
        <Content />
      </Suspense>
    </Shell>
  );
}

const HEADING = "mt-10 text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900";

async function Content() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/onboarding");
  if (session.member) redirect("/");
  if (session.deactivated) {
    return (
      <>
        <h1 className={HEADING}>{strings.onboarding.deactivatedTitle}</h1>
        <div className="mt-6" data-testid="deactivated">
          <Notice tone="info">{strings.onboarding.deactivated}</Notice>
        </div>
      </>
    );
  }
  return (
    <>
      <h1 className={HEADING}>{strings.onboarding.title}</h1>
      <p className="mt-3 text-slate-700">{strings.onboarding.intro}</p>
      <OnboardingForm strings={strings} defaultName={nameFromEmail(session.user.email)} />
    </>
  );
}


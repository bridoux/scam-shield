import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Shell } from "@/components/ui/Shell";
import { getSession } from "@/lib/auth";
import { getStrings } from "@/lib/content";
import { nameFromEmail } from "@/lib/urls";
import { OnboardingForm } from "./OnboardingForm";

const strings = getStrings("en-US");

export const metadata: Metadata = { title: `${strings.appName} · ${strings.onboarding.title}` };

export default function OnboardingPage() {
  return (
    <Shell appName={strings.appName}>
      <h1 className="mt-10 text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">{strings.onboarding.title}</h1>
      <p className="mt-3 text-slate-700">{strings.onboarding.intro}</p>
      <Suspense>
        <Form />
      </Suspense>
    </Shell>
  );
}

async function Form() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/onboarding");
  if (session.member) redirect("/");
  return <OnboardingForm strings={strings} defaultName={nameFromEmail(session.user.email)} />;
}


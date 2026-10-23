import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/ui/Shell";
import { getStrings } from "@/lib/content";
import { safeNextPath } from "@/lib/urls";
import { SignInForm } from "./SignInForm";

const strings = getStrings("en-US");

export const metadata: Metadata = { title: `${strings.appName} · ${strings.auth.title}` };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <Shell appName={strings.appName}>
      <h1 className="mt-10 text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">{strings.auth.title}</h1>
      <p className="mt-3 text-slate-700">{strings.auth.intro}</p>
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </Shell>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/");
  return <SignInForm strings={strings} next={next} linkFailed={params.error === "link"} />;
}

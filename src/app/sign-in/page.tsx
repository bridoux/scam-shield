import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Notice, Shell } from "@/components/ui/Shell";
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
      <SignInNotice />
    </Shell>
  );
}

/** "By signing in you accept the Terms of Service and the Privacy Policy", with both linked. */
function SignInNotice() {
  const l = strings.legal;
  const link = (href: string, label: string) => (
    <Link href={href} className="font-medium text-accent hover:underline">
      {label}
    </Link>
  );
  const [before, middle, after] = l.signInNotice.split(/\{terms\}|\{privacy\}/);
  return (
    <p className="mt-6 text-xs text-slate-600" data-testid="sign-in-notice">
      {before}
      {link("/terms", l.termsLink)}
      {middle}
      {link("/privacy", l.privacyLink)}
      {after}
    </p>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/");
  return (
    <>
      {params.deleted === "1" ? (
        <div className="mt-6" data-testid="account-deleted">
          <Notice tone="success">{strings.account.deleted}</Notice>
        </div>
      ) : null}
      <SignInForm strings={strings} next={next} linkFailed={params.error === "link"} />
    </>
  );
}

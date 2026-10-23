import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Notice, Shell } from "@/components/ui/Shell";
import { getSession } from "@/lib/auth";
import { format, getStrings } from "@/lib/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { nameFromEmail } from "@/lib/urls";
import { JoinForm } from "./JoinForm";

const strings = getStrings("en-US");
const j = strings.join;

export const metadata: Metadata = { title: `${strings.appName} · Join your team`, robots: { index: false } };

export default function JoinPage({ params }: PageProps<"/join/[token]">) {
  return (
    <Shell appName={strings.appName}>
      <Suspense>
        <JoinContent params={params} />
      </Suspense>
    </Shell>
  );
}

/** Looks the invite up with the service role: the visitor may not be signed in or a member yet. */
async function findInvite(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  await connection(); // checks expiry against the current time
  const { data, error } = await createAdminClient()
    .from("invites")
    .select("organization_id, expires_at, organizations(name)")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(`Loading invite failed: ${error.message}`);
  if (!data || new Date(data.expires_at) < new Date()) return null;
  return { organizationId: data.organization_id, company: data.organizations?.name ?? "" };
}

async function JoinContent({ params }: Pick<PageProps<"/join/[token]">, "params">) {
  const { token } = await params;
  const [invite, session] = await Promise.all([findInvite(token), getSession()]);

  if (!invite) {
    return (
      <div className="mt-10">
        <Notice tone="error">{j.invalid}</Notice>
      </div>
    );
  }

  const heading = (
    <>
      <h1 className="mt-10 text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">
        {format(j.title, { company: invite.company })}
      </h1>
      <p className="mt-3 text-slate-700">{format(j.intro, { company: invite.company })}</p>
    </>
  );

  if (!session) {
    return (
      <>
        {heading}
        <Link
          href={`/sign-in?next=${encodeURIComponent(`/join/${token}`)}`}
          className="mt-8 flex w-full items-center justify-center rounded-xl bg-accent px-6 py-3.5 text-lg font-semibold text-white hover:bg-accent-strong focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {j.signInFirst}
        </Link>
      </>
    );
  }

  if (session.member?.organizationId === invite.organizationId) redirect("/");
  if (session.member) {
    return (
      <>
        {heading}
        <div className="mt-8">
          <Notice tone="error">{j.alreadyMember}</Notice>
        </div>
      </>
    );
  }

  return (
    <>
      {heading}
      <JoinForm strings={strings} token={token} company={invite.company} defaultName={nameFromEmail(session.user.email)} />
    </>
  );
}

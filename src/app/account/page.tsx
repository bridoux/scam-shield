import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { Notice, Panel, Shell } from "@/components/ui/Shell";
import { getSession } from "@/lib/auth";
import { format, getStrings } from "@/lib/content";
import { DeleteAccountForm, DeleteCompanyForm } from "./DeleteForms";

const strings = getStrings("en-US");
const a = strings.account;

export const metadata: Metadata = { title: `${strings.appName} · ${a.title}` };

export default function AccountPage() {
  return (
    <Suspense fallback={<Shell appName={strings.appName}>{null}</Shell>}>
      <AccountContent />
    </Suspense>
  );
}

/** Works for everyone signed in, including people whose access was turned off. */
async function AccountContent() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/account");
  const member = session.member;
  const isOwner = member?.role === "owner";
  const company = member ? member.organizationName : session.deactivated ? a.accessOff : a.noCompany;
  const [before, after] = a.privacyNote.split("{privacy}");

  return (
    <Shell appName={strings.appName} accessory={member ? <AccountMenu member={member} strings={strings} /> : undefined}>
      <Link href="/" className="mt-8 text-sm font-semibold text-accent hover:underline">
        ← {a.back}
      </Link>
      <h1 className="mt-3 text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">{a.title}</h1>

      <Panel className="mt-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm" data-testid="account-details">
          <dt className="text-slate-600">{a.email}</dt>
          <dd className="min-w-0 truncate font-medium text-slate-900">{session.user.email}</dd>
          {member ? (
            <>
              <dt className="text-slate-600">{a.name}</dt>
              <dd className="min-w-0 truncate font-medium text-slate-900">{member.displayName}</dd>
              <dt className="text-slate-600">{a.role}</dt>
              <dd className="font-medium text-slate-900">{strings.team.roles[member.role]}</dd>
            </>
          ) : null}
          <dt className="text-slate-600">{a.company}</dt>
          <dd className="min-w-0 truncate font-medium text-slate-900">{company}</dd>
        </dl>
        <p className="mt-4 text-xs text-slate-600">
          {before}
          <Link href="/privacy" className="font-medium text-accent hover:underline">
            {strings.legal.privacyLink}
          </Link>
          {after}
        </p>
      </Panel>

      <Panel className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">{a.deleteHeading}</h2>
        {isOwner ? (
          <div className="mt-2">
            <Notice tone="info">{format(a.ownerFirst, { company: member.organizationName })}</Notice>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-700">{a.deleteIntro}</p>
            <DeleteAccountForm strings={strings} />
          </>
        )}
      </Panel>

      {isOwner ? (
        <Panel className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900">{a.companyHeading}</h2>
          <p className="mt-1 text-sm text-slate-700">{format(a.companyIntro, { company: member.organizationName })}</p>
          <DeleteCompanyForm strings={strings} />
        </Panel>
      ) : null}
    </Shell>
  );
}

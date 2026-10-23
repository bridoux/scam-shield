import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { revokeInvite } from "@/app/actions/company";
import { AccountMenu } from "@/components/AccountMenu";
import { Notice, Panel, Shell } from "@/components/ui/Shell";
import { getSession, type Member } from "@/lib/auth";
import { format, getStrings } from "@/lib/content";
import { requestOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { CopyLinkButton, CreateInviteForm } from "./InviteControls";

const strings = getStrings("en-US");
const t = strings.team;

export const metadata: Metadata = { title: `${strings.appName} · ${t.title}` };

export default function TeamPage() {
  return (
    <Suspense fallback={<Shell appName={strings.appName}>{null}</Shell>}>
      <TeamContent />
    </Suspense>
  );
}

async function TeamContent() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/team");
  const member = session.member;
  if (!member) redirect("/onboarding");

  return (
    <Shell appName={strings.appName} accessory={<AccountMenu member={member} strings={strings} />}>
      <Link href="/" className="mt-8 text-sm font-semibold text-accent hover:underline">
        ← {t.back}
      </Link>
      <h1 className="mt-3 text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">{t.title}</h1>
      <p className="mt-1 text-slate-700">{member.organizationName}</p>
      {member.role === "player" ? (
        <div className="mt-6">
          <Notice tone="info">{t.ownersOnly}</Notice>
        </div>
      ) : (
        <Invites member={member} />
      )}
      <Members organizationId={member.organizationId} />
    </Shell>
  );
}

async function Invites({ member }: { member: Member }) {
  const supabase = await createClient();
  const [{ data: teams }, { data: invites }, origin] = await Promise.all([
    supabase.from("teams").select("id, name").eq("organization_id", member.organizationId).order("created_at"),
    supabase
      .from("invites")
      .select("token, expires_at, teams(name)")
      .eq("organization_id", member.organizationId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
    requestOrigin(),
  ]);
  const dateFormat = new Intl.DateTimeFormat(strings.locale, { month: "short", day: "numeric" });

  return (
    <Panel className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">{t.inviteHeading}</h2>
      <p className="mt-1 text-sm text-slate-700">{format(t.inviteIntro, { company: member.organizationName })}</p>
      <CreateInviteForm strings={strings} teams={teams ?? []} />

      <h3 className="mt-6 text-sm font-semibold tracking-wide text-slate-600 uppercase">{t.activeInvites}</h3>
      {invites && invites.length > 0 ? (
        <ul className="mt-2 space-y-3" data-testid="invite-list">
          {invites.map((invite) => {
            const url = `${origin}/join/${invite.token}`;
            return (
              <li key={invite.token} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="flex items-start gap-2">
                  <code className="min-w-0 flex-1 text-xs break-all text-slate-800 select-all" data-testid="invite-url">
                    {url}
                  </code>
                  <CopyLinkButton url={url} strings={strings} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    {invite.teams?.name ? `${invite.teams.name} · ` : ""}
                    {format(t.expires, { date: dateFormat.format(new Date(invite.expires_at)) })}
                  </span>
                  <form action={revokeInvite}>
                    <input type="hidden" name="token" value={invite.token} />
                    <button type="submit" className="font-semibold text-danger hover:underline">
                      {t.revoke}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-600">{t.noInvites}</p>
      )}
    </Panel>
  );
}

async function Members({ organizationId }: { organizationId: string }) {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("memberships")
    .select("user_id, display_name, role, teams(name)")
    .eq("organization_id", organizationId)
    .order("created_at");

  return (
    <Panel className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">{t.members}</h2>
      <ul className="mt-2 divide-y divide-slate-200" data-testid="member-list">
        {(members ?? []).map((m) => (
          <li key={m.user_id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-900">{m.display_name}</span>
              {m.teams?.name ? <span className="block text-xs text-slate-600">{m.teams.name}</span> : null}
            </span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {t.roles[m.role as keyof typeof t.roles] ?? m.role}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

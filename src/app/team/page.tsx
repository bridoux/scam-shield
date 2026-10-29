import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { revokeInvite } from "@/app/actions/company";
import { AccountMenu } from "@/components/AccountMenu";
import { Notice, Panel, Shell } from "@/components/ui/Shell";
import { getSession, type Member } from "@/lib/auth";
import { format, getStrings } from "@/lib/content";
import { permissionsFor, type Role } from "@/lib/members";
import { requestOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { CopyLinkButton, CreateInviteForm } from "./InviteControls";
import { ManageMember, RestoreAccess } from "./MemberControls";
import { PlayDaysForm } from "./PlayDaysForm";
import { AddTeamForm, TeamRow } from "./TeamControls";

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
      <Panel className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">{t.playDaysHeading}</h2>
        <p className="mt-1 text-sm text-slate-700">{member.role === "owner" ? t.playDaysIntro : t.playDaysReadOnly}</p>
        <PlayDaysForm strings={strings} playDays={member.playDays} canEdit={member.role === "owner"} />
      </Panel>
      <People member={member} />
    </Shell>
  );
}

async function Invites({ member }: { member: Member }) {
  const supabase = await createClient();
  const [{ data: teams }, { data: invites }, origin] = await Promise.all([
    supabase.from("teams").select("id, name").eq("organization_id", member.organizationId).order("created_at"),
    supabase
      .from("invites")
      .select("token, expires_at, uses, max_uses, teams(name)")
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
                    {invite.uses >= invite.max_uses ? t.full : format(t.uses, { uses: invite.uses, max: invite.max_uses })}
                    {" · "}
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

interface MemberRow {
  userId: string;
  displayName: string;
  role: Role;
  teamId: string | null;
  teamName: string | null;
  deactivatedAt: string | null;
}

/** Teams, current members and former members. Owners and admins get the controls their role allows. */
async function People({ member }: { member: Member }) {
  const supabase = await createClient();
  const [{ data: teamRows }, { data: memberRows }] = await Promise.all([
    supabase.from("teams").select("id, name").eq("organization_id", member.organizationId).order("created_at"),
    supabase
      .from("memberships")
      .select("user_id, display_name, role, team_id, deactivated_at, teams(name)")
      .eq("organization_id", member.organizationId)
      .order("created_at"),
  ]);
  const teams = teamRows ?? [];
  const people: MemberRow[] = (memberRows ?? []).map((m) => ({
    userId: m.user_id,
    displayName: m.display_name,
    role: m.role as Role,
    teamId: m.team_id,
    teamName: m.teams?.name ?? null,
    deactivatedAt: m.deactivated_at,
  }));
  const active = people.filter((p) => !p.deactivatedAt);
  const former = people.filter((p) => p.deactivatedAt);
  const isManager = member.role !== "player";
  const viewer = { userId: member.userId, role: member.role };

  return (
    <>
      {isManager ? (
        <Panel className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900">{t.teamsHeading}</h2>
          <p className="mt-1 text-sm text-slate-700">{t.teamsIntro}</p>
          <ul className="mt-2 divide-y divide-slate-200" data-testid="team-list">
            {teams.map((team) => (
              <TeamRow key={team.id} strings={strings} team={{ ...team, people: active.filter((p) => p.teamId === team.id).length }} />
            ))}
          </ul>
          <AddTeamForm strings={strings} />
        </Panel>
      ) : null}

      <Panel className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">{t.members}</h2>
        {isManager ? <p className="mt-1 text-sm text-slate-700">{t.membersIntro}</p> : null}
        <ul className="mt-2 divide-y divide-slate-200" data-testid="member-list">
          {active.map((p) => {
            const permissions = permissionsFor(viewer, { userId: p.userId, role: p.role, active: true });
            const canManage = Object.values(permissions).some(Boolean);
            return (
              <li key={p.userId} className="py-2.5" data-testid="member-row">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">
                      {p.displayName}
                      {p.userId === member.userId ? <span className="font-normal text-slate-500"> · {t.you}</span> : null}
                    </span>
                    {p.teamName ? <span className="block text-xs text-slate-600">{p.teamName}</span> : null}
                  </span>
                  <RoleBadge role={p.role} />
                </div>
                {canManage ? <ManageMember strings={strings} member={p} teams={teams} permissions={permissions} /> : null}
              </li>
            );
          })}
        </ul>
      </Panel>

      {isManager && former.length > 0 ? <FormerMembers former={former} viewer={viewer} timeZone={member.timeZone} /> : null}
    </>
  );
}

function FormerMembers({ former, viewer, timeZone }: { former: MemberRow[]; viewer: { userId: string; role: Role }; timeZone: string }) {
  const dateFormat = new Intl.DateTimeFormat(strings.locale, { month: "short", day: "numeric", year: "numeric", timeZone });
  return (
    <Panel className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">{t.formerMembers}</h2>
      <p className="mt-1 text-sm text-slate-700">{t.formerIntro}</p>
      <ul className="mt-2 divide-y divide-slate-200" data-testid="former-list">
        {former.map((p) => (
          <li key={p.userId} className="flex items-center justify-between gap-3 py-2.5" data-testid="former-row">
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-900">{p.displayName}</span>
              <span className="block text-xs text-slate-600">{format(t.leftOn, { date: dateFormat.format(new Date(p.deactivatedAt!)) })}</span>
            </span>
            {permissionsFor(viewer, { userId: p.userId, role: p.role, active: false }).canChangeAccess ? (
              <RestoreAccess strings={strings} userId={p.userId} />
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{t.roles[role] ?? role}</span>
  );
}

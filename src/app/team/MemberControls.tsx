"use client";

import { useId, useState, type ReactNode } from "react";
import { changeRole, makeOwner, moveMember, setMemberActive } from "@/app/actions/members";
import { format, type UiStrings } from "@/lib/content";
import type { MemberPermissions, Role } from "@/lib/members";
import { ActionForm, buttonClass, SELECT, SmallSubmit } from "./controls";

interface ManageMemberProps {
  strings: UiStrings;
  member: { userId: string; displayName: string; role: Role; teamId: string | null };
  teams: { id: string; name: string }[];
  permissions: MemberPermissions;
}

/** The "Manage" panel under one active member: team, role, ownership and removal. */
export function ManageMember({ strings, member, teams, permissions }: ManageMemberProps) {
  const t = strings.team;
  const id = useId();
  const hidden = <input type="hidden" name="userId" value={member.userId} />;

  return (
    <details className="group mt-2" data-testid="manage-member">
      <summary className="cursor-pointer text-sm font-semibold text-accent hover:underline">{t.manage}</summary>
      <div className="mt-3 space-y-4 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
        {permissions.canMove ? (
          <ActionForm action={moveMember} strings={strings} testId="move-member">
            {hidden}
            <label htmlFor={`${id}-team`} className="text-xs font-semibold text-slate-700">
              {t.memberTeam}
            </label>
            <div className="mt-1 flex gap-2">
              <select id={`${id}-team`} name="teamId" defaultValue={member.teamId ?? ""} className={SELECT}>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
                <option value="">{t.noTeam}</option>
              </select>
              <SmallSubmit pendingLabel={t.saving}>{t.move}</SmallSubmit>
            </div>
          </ActionForm>
        ) : null}

        {permissions.canChangeRole ? (
          <ActionForm action={changeRole} strings={strings} testId="change-role">
            {hidden}
            <label htmlFor={`${id}-role`} className="text-xs font-semibold text-slate-700">
              {t.memberRole}
            </label>
            <div className="mt-1 flex gap-2">
              <select id={`${id}-role`} name="role" defaultValue={member.role} className={SELECT}>
                <option value="player">{t.roles.player}</option>
                <option value="admin">{t.roles.admin}</option>
              </select>
              <SmallSubmit pendingLabel={t.saving}>{t.changeRole}</SmallSubmit>
            </div>
          </ActionForm>
        ) : null}

        {permissions.canMakeOwner ? (
          <Confirmed
            strings={strings}
            label={t.makeOwner}
            question={format(t.makeOwnerConfirm, { name: member.displayName })}
            confirmLabel={t.confirmMakeOwner}
            variant="quiet"
            testId="make-owner"
            form={(confirm) => (
              <ActionForm action={makeOwner} strings={strings}>
                {hidden}
                {confirm}
              </ActionForm>
            )}
          />
        ) : null}

        {permissions.canChangeAccess ? (
          <Confirmed
            strings={strings}
            label={t.deactivate}
            question={format(t.deactivateConfirm, { name: member.displayName })}
            confirmLabel={t.confirmDeactivate}
            variant="danger"
            testId="deactivate-member"
            form={(confirm) => (
              <ActionForm action={setMemberActive} strings={strings}>
                {hidden}
                <input type="hidden" name="active" value="false" />
                {confirm}
              </ActionForm>
            )}
          />
        ) : null}
      </div>
    </details>
  );
}

interface ConfirmedProps {
  strings: UiStrings;
  label: string;
  question: string;
  confirmLabel: string;
  variant: "quiet" | "danger";
  testId: string;
  /** Renders the form around the confirm buttons. */
  form: (confirm: ReactNode) => ReactNode;
}

/** A button that asks first: the action only runs from the second, explicit confirm. */
function Confirmed({ strings, label, question, confirmLabel, variant, testId, form }: ConfirmedProps) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={buttonClass(variant)} data-testid={testId}>
        {label}
      </button>
    );
  }
  return (
    <div data-testid={`${testId}-confirm`}>
      <p className="text-sm text-slate-800">{question}</p>
      {form(
        <div className="mt-2 flex gap-2">
          <SmallSubmit pendingLabel={strings.team.saving} variant={variant === "danger" ? "danger" : "primary"}>
            {confirmLabel}
          </SmallSubmit>
          <button type="button" onClick={() => setAsking(false)} className={buttonClass("quiet")}>
            {strings.team.cancel}
          </button>
        </div>,
      )}
    </div>
  );
}

/** Gives a former member their access back. */
export function RestoreAccess({ strings, userId }: { strings: UiStrings; userId: string }) {
  return (
    <ActionForm action={setMemberActive} strings={strings} testId="restore-member">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value="true" />
      <SmallSubmit pendingLabel={strings.team.saving} variant="quiet">
        {strings.team.reactivate}
      </SmallSubmit>
    </ActionForm>
  );
}

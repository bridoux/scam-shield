"use client";

import { useId, useState } from "react";
import { addTeam, deleteTeam, renameTeam, type MemberActionState } from "@/app/actions/members";
import { format, type UiStrings } from "@/lib/content";
import { ActionForm, buttonClass, SELECT, SmallSubmit } from "./controls";

/** One team: its name and head count, with rename and (when empty) delete. */
export function TeamRow({ strings, team }: { strings: UiStrings; team: { id: string; name: string; people: number } }) {
  const t = strings.team;
  const id = useId();
  const [renaming, setRenaming] = useState(false);
  const count = team.people === 1 ? t.onePerson : format(t.people, { count: team.people });

  // Closes the editor once the rename is saved; errors keep it open with the message.
  async function rename(prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
    const result = await renameTeam(prev, formData);
    if (result.status === "done") setRenaming(false);
    return result;
  }

  if (renaming) {
    return (
      <li className="py-2.5" data-testid="team-row">
        <ActionForm action={rename} strings={strings}>
          <input type="hidden" name="teamId" value={team.id} />
          <label htmlFor={`${id}-name`} className="sr-only">
            {t.teamName}
          </label>
          <div className="flex gap-2">
            <input id={`${id}-name`} name="name" defaultValue={team.name} maxLength={80} required className={SELECT} />
            <SmallSubmit pendingLabel={t.saving}>{t.save}</SmallSubmit>
            <button type="button" onClick={() => setRenaming(false)} className={buttonClass("quiet")}>
              {t.cancel}
            </button>
          </div>
        </ActionForm>
      </li>
    );
  }

  return (
    <li className="py-2.5" data-testid="team-row">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-slate-900">{team.name}</span>
          <span className="block text-xs text-slate-600">{count}</span>
        </span>
        <button type="button" onClick={() => setRenaming(true)} className={buttonClass("quiet")}>
          {t.rename}
        </button>
        {team.people === 0 ? (
          <ActionForm action={deleteTeam} strings={strings}>
            <input type="hidden" name="teamId" value={team.id} />
            <SmallSubmit pendingLabel={t.saving} variant="quiet">
              {t.deleteTeam}
            </SmallSubmit>
          </ActionForm>
        ) : null}
      </div>
    </li>
  );
}

export function AddTeamForm({ strings }: { strings: UiStrings }) {
  const t = strings.team;
  return (
    <ActionForm action={addTeam} strings={strings} className="mt-3" testId="add-team">
      <label htmlFor="new-team-name" className="text-xs font-semibold text-slate-700">
        {t.newTeamName}
      </label>
      <div className="mt-1 flex gap-2">
        <input id="new-team-name" name="name" maxLength={80} required className={SELECT} />
        <SmallSubmit pendingLabel={t.adding}>{t.addTeam}</SmallSubmit>
      </div>
    </ActionForm>
  );
}

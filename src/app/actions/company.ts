"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isTimeZone } from "@/lib/play/dates";
import { allow } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { Industry } from "@/lib/types";
import { cleanText } from "@/lib/urls";
import { logError } from "@/lib/errors/report";

const INDUSTRIES: readonly Industry[] = ["general", "auto_dealer", "tax_cpa", "mortgage_title", "insurance"];
/** Invite tokens are two UUIDs without dashes. */
const INVITE_TOKEN = /^[0-9a-f]{64}$/;

export type FormState = { status: "idle" } | { status: "error"; error: string };

/** Postgres raises these hints from create_organization / accept_invite. */
function hintOf(error: { hint?: string | null } | null): string | null {
  return error?.hint ?? null;
}

export async function createCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = cleanText(formData.get("company"), 120);
  const team = cleanText(formData.get("team"), 80);
  const displayName = cleanText(formData.get("displayName"), 80);
  const industry = String(formData.get("industry") ?? "") as Industry;
  const zone = String(formData.get("timeZone") ?? "");
  if (!name || name.length < 2 || !team || !displayName || !INDUSTRIES.includes(industry)) {
    return { status: "error", error: "invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", {
    org_name: name,
    org_industry: industry,
    team_name: team,
    member_display_name: displayName,
    org_time_zone: isTimeZone(zone) ? zone : "UTC",
  });
  if (error) {
    if (hintOf(error) === "already_member") return { status: "error", error: "alreadyMember" };
    logError("company.createOrganization", error);
    return { status: "error", error: "failed" };
  }
  redirect("/team");
}

export async function acceptInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const displayName = cleanText(formData.get("displayName"), 80);
  if (!INVITE_TOKEN.test(token)) return { status: "error", error: "invalid" };
  if (!displayName) return { status: "error", error: "failed" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { invite_token: token, member_display_name: displayName });
  if (error) {
    const hint = hintOf(error);
    if (hint === "invalid_invite") return { status: "error", error: "invalid" };
    if (hint === "already_member") return { status: "error", error: "alreadyMember" };
    if (hint === "deactivated") return { status: "error", error: "deactivated" };
    if (hint === "invite_full") return { status: "error", error: "full" };
    logError("company.acceptInvite", error);
    return { status: "error", error: "failed" };
  }
  redirect("/");
}

export async function createInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  const member = session?.member;
  if (!member || member.role === "player") return { status: "error", error: "ownersOnly" };
  if (!(await allow("invite", member.userId))) return { status: "error", error: "tooMany" };

  const teamId = String(formData.get("teamId") ?? "") || null;
  const supabase = await createClient();
  // RLS checks the caller is an owner/admin of this organization; the FK checks the team belongs to it.
  const { error } = await supabase.from("invites").insert({
    organization_id: member.organizationId,
    team_id: teamId,
    created_by: member.userId,
  });
  if (hintOf(error) === "too_many_invites") return { status: "error", error: "tooManyInvites" };
  if (error) {
    logError("company.createInvite", error);
    return { status: "error", error: "failed" };
  }
  revalidatePath("/team");
  return { status: "idle" };
}

export async function revokeInvite(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!INVITE_TOKEN.test(token)) return;
  const supabase = await createClient();
  // RLS limits deletes to owners/admins of the invite's organization.
  const { error } = await supabase.from("invites").delete().eq("token", token);
  if (error) logError("company.revokeInvite", error);
  revalidatePath("/team");
}

export type PlayDaysState = { status: "idle" | "saved" } | { status: "error"; error: "noDays" | "notOwner" | "failed" };

/** Owner-only (enforced by the set_play_days function): which weekdays count for streaks. */
export async function savePlayDays(_prev: PlayDaysState, formData: FormData): Promise<PlayDaysState> {
  const days = formData
    .getAll("day")
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
  if (days.length === 0) return { status: "error", error: "noDays" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_play_days", { days });
  if (error) {
    const hint = hintOf(error);
    if (hint === "not_owner") return { status: "error", error: "notOwner" };
    if (hint === "no_days") return { status: "error", error: "noDays" };
    logError("company.setPlayDays", error);
    return { status: "error", error: "failed" };
  }
  revalidatePath("/team");
  return { status: "saved" };
}

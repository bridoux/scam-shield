"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cleanText } from "@/lib/urls";
import { logError } from "@/lib/errors/report";

// Every rule (who may change whom) is enforced by the database functions and RLS policies;
// these actions validate input and turn database refusals into messages.

export type MemberError =
  | "notAuthorized"
  | "memberDeactivated"
  | "notAdmin"
  | "nameTaken"
  | "teamNameInvalid"
  | "teamNotEmpty"
  | "failed";

export type MemberActionState = { status: "idle" | "done" } | { status: "error"; error: MemberError };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNIQUE_VIOLATION = "23505";

const HINTS: Record<string, MemberError> = {
  not_authorized: "notAuthorized",
  not_found: "notAuthorized",
  deactivated: "memberDeactivated",
  not_admin: "notAdmin",
};

const DONE: MemberActionState = { status: "done" };
const fail = (error: MemberError): MemberActionState => ({ status: "error", error });

function idFrom(formData: FormData, field: string): string | null {
  const value = String(formData.get(field) ?? "");
  return UUID.test(value) ? value : null;
}

/** The caller's company, if they are an owner or admin. */
async function managerOrganization(): Promise<string | null> {
  const member = (await getSession())?.member;
  return member && member.role !== "player" ? member.organizationId : null;
}

function refused(action: string, error: { code?: string; hint?: string | null; message: string }): MemberActionState {
  const known = error.hint ? HINTS[error.hint] : undefined;
  if (known) return fail(known);
  logError(`members.${action}`, error);
  return fail("failed");
}

function done(): MemberActionState {
  revalidatePath("/team");
  return DONE;
}

export async function addTeam(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const name = cleanText(formData.get("name"), 80);
  if (!name) return fail("teamNameInvalid");
  const org = await managerOrganization();
  if (!org) return fail("notAuthorized");

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({ organization_id: org, name });
  if (error?.code === UNIQUE_VIOLATION) return fail("nameTaken");
  if (error) return refused("add team", error);
  return done();
}

export async function renameTeam(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const teamId = idFrom(formData, "teamId");
  const name = cleanText(formData.get("name"), 80);
  if (!teamId) return fail("failed");
  if (!name) return fail("teamNameInvalid");

  const supabase = await createClient();
  // RLS limits updates to owners and admins of the team's company.
  const { data, error } = await supabase.from("teams").update({ name }).eq("id", teamId).select("id");
  if (error?.code === UNIQUE_VIOLATION) return fail("nameTaken");
  if (error) return refused("rename team", error);
  if (data.length === 0) return fail("notAuthorized");
  return done();
}

export async function deleteTeam(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const teamId = idFrom(formData, "teamId");
  if (!teamId) return fail("failed");
  if (!(await managerOrganization())) return fail("notAuthorized");

  const supabase = await createClient();
  // The delete policy only matches teams with no active members.
  const { data, error } = await supabase.from("teams").delete().eq("id", teamId).select("id");
  if (error) return refused("delete team", error);
  if (data.length === 0) return fail("teamNotEmpty");
  return done();
}

export async function moveMember(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const target = idFrom(formData, "userId");
  const rawTeam = String(formData.get("teamId") ?? "");
  const team = rawTeam === "" ? null : idFrom(formData, "teamId");
  if (!target || (rawTeam !== "" && !team)) return fail("failed");

  const supabase = await createClient();
  // The generated types don't mark function arguments nullable; null means "no team".
  const { error } = await supabase.rpc("set_member_team", { target, new_team: team as string });
  return error ? refused("move member", error) : done();
}

export async function changeRole(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const target = idFrom(formData, "userId");
  const role = String(formData.get("role") ?? "");
  if (!target || (role !== "admin" && role !== "player")) return fail("failed");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", { target, new_role: role });
  return error ? refused("change role", error) : done();
}

export async function setMemberActive(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const target = idFrom(formData, "userId");
  const active = String(formData.get("active") ?? "");
  if (!target || (active !== "true" && active !== "false")) return fail("failed");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_active", { target, active: active === "true" });
  return error ? refused(active === "true" ? "reactivate member" : "deactivate member", error) : done();
}

export async function makeOwner(_prev: MemberActionState, formData: FormData): Promise<MemberActionState> {
  const target = idFrom(formData, "userId");
  if (!target) return fail("failed");

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_ownership", { new_owner: target });
  return error ? refused("transfer ownership", error) : done();
}

import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Member {
  userId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  /** IANA zone that decides which day a round counts for. */
  timeZone: string;
  teamId: string | null;
  role: "owner" | "admin" | "player";
  displayName: string;
}

/** The signed-in user's id and email, verified with Supabase Auth, or null. */
export async function getUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

/** The signed-in user with their company membership. `member` is null until they create or join a company. */
export async function getSession(): Promise<{ user: { id: string; email: string }; member: Member | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const user = { id: data.user.id, email: data.user.email ?? "" };

  const { data: row, error: memberError } = await supabase
    .from("memberships")
    .select("organization_id, team_id, role, display_name, organizations(name, time_zone)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberError) throw new Error(`Loading membership failed: ${memberError.message}`);
  if (!row) return { user, member: null };

  return {
    user,
    member: {
      userId: user.id,
      email: user.email,
      organizationId: row.organization_id,
      organizationName: row.organizations?.name ?? "",
      timeZone: row.organizations?.time_zone ?? "UTC",
      teamId: row.team_id,
      role: row.role as Member["role"],
      displayName: row.display_name,
    },
  };
}

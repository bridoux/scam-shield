import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Member {
  userId: string;
  email: string;
  organizationId: string;
  organizationName: string;
  /** IANA zone that decides which day a round counts for. */
  timeZone: string;
  /** ISO weekdays (1 = Monday) on which a round is expected; decides streaks. */
  playDays: number[];
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

export interface Session {
  user: { id: string; email: string };
  /** Null until they create or join a company, and while their access is turned off. */
  member: Member | null;
  /** Their company turned off their access. Their membership row stays, so they can't start or join another. */
  deactivated: boolean;
}

/** The signed-in user with their company membership. */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const user = { id: data.user.id, email: data.user.email ?? "" };

  const { data: row, error: memberError } = await supabase
    .from("memberships")
    .select("organization_id, team_id, role, display_name, deactivated_at, organizations(name, time_zone, play_days)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberError) throw new Error(`Loading membership failed: ${memberError.message}`);
  if (!row) return { user, member: null, deactivated: false };
  if (row.deactivated_at) return { user, member: null, deactivated: true };

  return {
    user,
    deactivated: false,
    member: {
      userId: user.id,
      email: user.email,
      organizationId: row.organization_id,
      organizationName: row.organizations?.name ?? "",
      timeZone: row.organizations?.time_zone ?? "UTC",
      playDays: row.organizations?.play_days ?? [1, 2, 3, 4, 5],
      teamId: row.team_id,
      role: row.role as Member["role"],
      displayName: row.display_name,
    },
  };
}

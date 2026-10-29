export type Role = "owner" | "admin" | "player";

export interface MemberPermissions {
  canMove: boolean;
  canChangeRole: boolean;
  canMakeOwner: boolean;
  /** Deactivate an active member, or reactivate a former one. */
  canChangeAccess: boolean;
}

const NONE: MemberPermissions = { canMove: false, canChangeRole: false, canMakeOwner: false, canChangeAccess: false };

/**
 * What `viewer` may do to `target` on the team page. Mirrors the database rules
 * (supabase/migrations/*_member_management.sql), which are the real guard: the owner manages
 * everyone else, admins manage players, and people may only change their own team.
 */
export function permissionsFor(
  viewer: { userId: string; role: Role },
  target: { userId: string; role: Role; active: boolean },
): MemberPermissions {
  if (viewer.role === "player") return NONE;
  if (viewer.userId === target.userId) return { ...NONE, canMove: target.active };

  const manageable = target.role !== "owner" && (viewer.role === "owner" || target.role === "player");
  if (!manageable) return NONE;

  return {
    canMove: target.active,
    canChangeRole: viewer.role === "owner" && target.active,
    canMakeOwner: viewer.role === "owner" && target.active && target.role === "admin",
    canChangeAccess: true,
  };
}

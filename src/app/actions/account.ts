"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DeleteState =
  | { status: "idle" }
  | { status: "error"; error: "mismatch" | "ownerFirst" | "notOwner" | "signedOut" | "failed" };

const fail = (error: Exclude<DeleteState, { status: "idle" }>["error"]): DeleteState => ({ status: "error", error });

/**
 * Erases the signed-in person's account: sign-in, membership and every round (the foreign keys
 * cascade). A company owner must hand over ownership or delete the company first, so no company
 * is left without an owner.
 */
export async function deleteMyAccount(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const session = await getSession();
  if (!session) return fail("signedOut");
  const typed = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (!typed || typed !== session.user.email.toLowerCase()) return fail("mismatch");

  // Re-read the role with the service role: the session's copy could be stale after a transfer.
  const admin = createAdminClient();
  const { data: membership, error: readError } = await admin
    .from("memberships")
    .select("role")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (readError) {
    console.error("[account] reading membership failed", readError.code, readError.message);
    return fail("failed");
  }
  if (membership?.role === "owner") return fail("ownerFirst");

  const { error } = await admin.auth.admin.deleteUser(session.user.id);
  if (error) {
    console.error("[account] deleteUser failed", error.status, error.code);
    return fail("failed");
  }
  // The session belongs to a user that no longer exists; clear its cookies on this device.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/sign-in?deleted=1");
}

/** Owner only (enforced by delete_organization): erases the company and all its training data. */
export async function deleteCompany(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const typed = String(formData.get("confirm") ?? "");
  if (!typed.trim()) return fail("mismatch");

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_organization", { confirm_name: typed });
  if (error?.hint === "name_mismatch") return fail("mismatch");
  if (error?.hint === "not_authorized") return fail("notOwner");
  if (error) {
    console.error("[account] delete_organization failed", error.code, error.message);
    return fail("failed");
  }
  redirect("/onboarding");
}

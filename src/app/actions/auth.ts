"use server";

import { redirect } from "next/navigation";
import { requestOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail, safeNextPath } from "@/lib/urls";

export type SignInState = { status: "idle" } | { status: "sent"; email: string } | { status: "error"; error: "invalidEmail" | "failed" };

export async function sendMagicLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = normalizeEmail(formData.get("email"));
  if (!email) return { status: "error", error: "invalidEmail" };
  const next = safeNextPath(formData.get("next"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    console.error("[auth] signInWithOtp failed", error.status, error.code);
    return { status: "error", error: "failed" };
  }
  return { status: "sent", email };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

"use server";

import { redirect } from "next/navigation";
import { classifySignInError } from "@/lib/auth-errors";
import { allow, clientIp } from "@/lib/rate-limit";
import { requestOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail, safeNextPath } from "@/lib/urls";

export type SignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; error: "invalidEmail" | "failed" | "hourlyLimit" | "tooMany" }
  | { status: "error"; error: "cooldown"; seconds: number | null };

export async function sendMagicLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = normalizeEmail(formData.get("email"));
  if (!email) return { status: "error", error: "invalidEmail" };
  const next = safeNextPath(formData.get("next"));
  const [ipAllowed, emailAllowed] = await Promise.all([allow("signInIp", await clientIp()), allow("signInEmail", email)]);
  if (!ipAllowed || !emailAllowed) return { status: "error", error: "tooMany" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    const failure = classifySignInError(error);
    if (failure.kind === "cooldown") return { status: "error", error: "cooldown", seconds: failure.seconds };
    if (failure.kind === "hourlyLimit") {
      // The project's email allowance is used up: worth seeing in the logs, it blocks every sign-in.
      console.warn("[auth] email rate limit reached", error.status, error.code);
      return { status: "error", error: "hourlyLimit" };
    }
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

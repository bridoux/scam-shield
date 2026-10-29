"use server";

import { redirect } from "next/navigation";
import { classifySignInError } from "@/lib/auth-errors";
import { allow, clientIp, emailSubject } from "@/lib/rate-limit";
import { requestOrigin } from "@/lib/origin";
import { createClient } from "@/lib/supabase/server";
import { normalizeEmail, safeNextPath } from "@/lib/urls";
import { logError } from "@/lib/errors/report";

export type SignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; error: "invalidEmail" | "failed" | "hourlyLimit" | "tooMany" }
  | { status: "error"; error: "cooldown"; seconds: number | null };

export async function sendMagicLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = normalizeEmail(formData.get("email"));
  if (!email) return { status: "error", error: "invalidEmail" };
  const next = safeNextPath(formData.get("next"));
  // The IP check runs first so a refused request doesn't also use up the person's email allowance.
  const ip = await clientIp();
  if (ip && !(await allow("signInIp", ip))) return { status: "error", error: "tooMany" };
  if (!(await allow("signInEmail", emailSubject(email)))) return { status: "error", error: "tooMany" };

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
      // The project's email allowance is used up: worth an alert, it blocks every sign-in.
      logError("auth.emailLimitReached", error);
      return { status: "error", error: "hourlyLimit" };
    }
    logError("auth.signInWithOtp", error);
    return { status: "error", error: "failed" };
  }
  return { status: "sent", email };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

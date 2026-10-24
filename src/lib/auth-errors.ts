/** Why a magic link couldn't be sent, in terms the sign-in form can explain. */
export type SignInFailure =
  /** Too soon after this address's last request; `seconds` when Supabase says how long. */
  | { kind: "cooldown"; seconds: number | null }
  /** The project's hourly email allowance is used up (built-in Supabase email: 2 per hour). */
  | { kind: "hourlyLimit" }
  | { kind: "failed" };

interface AuthErrorLike {
  code?: string | null;
  message?: string | null;
  status?: number | null;
}

/**
 * Both limits come back as 429 with code "over_email_send_rate_limit"; only the message
 * differs ("…only request this after 15 seconds" vs "email rate limit exceeded").
 */
export function classifySignInError(error: AuthErrorLike): SignInFailure {
  const message = error.message ?? "";
  const wait = /only request this after (\d+) seconds?/i.exec(message);
  if (wait) return { kind: "cooldown", seconds: Number(wait[1]) };
  if (error.code === "over_request_rate_limit") return { kind: "cooldown", seconds: null };
  if (error.code === "over_email_send_rate_limit" || /email rate limit/i.test(message)) return { kind: "hourlyLimit" };
  return { kind: "failed" };
}

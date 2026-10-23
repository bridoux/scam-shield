import type { Page } from "@playwright/test";
import { createAdminClient } from "../src/lib/supabase/admin-client";

export const admin = createAdminClient();

/** Retries an admin call when the network drops ("fetch failed"); other errors surface immediately. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i >= attempts || !String(error).includes("fetch failed")) throw error;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

/** Creates a confirmed test user and returns their id and email. */
export async function createUser(label: string): Promise<{ id: string; email: string }> {
  const email = `ss-e2e-${label}-${crypto.randomUUID().slice(0, 8)}@scam-shield.example`;
  return withRetry(async () => {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
    return { id: data.user.id, email };
  });
}

/**
 * Signs the browser in the way a magic link would, without sending email: the admin API
 * mints a one-time token and the app's /auth/confirm route exchanges it for a session.
 */
export async function signIn(page: Page, email: string, next = "/"): Promise<void> {
  const data = await withRetry(async () => {
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error) throw new Error(`generateLink failed: ${error.message}`);
    return data;
  });
  const params = new URLSearchParams({ token_hash: data.properties.hashed_token, type: "magiclink", next });
  await page.goto(`/auth/confirm?${params}`);
}

/** Removes test users (memberships and rounds cascade) and the companies they own. */
export async function removeUsers(userIds: string[]): Promise<void> {
  const { data: owned } = await admin.from("memberships").select("organization_id").in("user_id", userIds).eq("role", "owner");
  const orgIds = (owned ?? []).map((m) => m.organization_id);
  if (orgIds.length > 0) await admin.from("organizations").delete().in("id", orgIds);
  await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
}

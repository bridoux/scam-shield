import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { finishRound, startRound, submitAnswer } from "@/lib/play/core";
import { createAdminClient } from "@/lib/supabase/admin-client";
import type { Database } from "@/lib/supabase/database.types";
import { publicSupabaseEnv } from "@/lib/supabase/env";

export type UserClient = SupabaseClient<Database>;

export interface TestUser {
  id: string;
  email: string;
  /** Acts as this user through the public API, so RLS applies. */
  client: UserClient;
}

export const admin = createAdminClient();

/** Creates a confirmed user and signs them in with a magic-link token (no password, no email sent). */
export async function createTestUser(label: string): Promise<TestUser> {
  const email = `ss-test-${label}-${crypto.randomUUID().slice(0, 8)}@scam-shield.example`;
  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error || !created.user) throw new Error(`createUser failed: ${error?.message}`);

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw new Error(`generateLink failed: ${linkError.message}`);

  const { url, anonKey } = publicSupabaseEnv();
  const client = createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: otpError } = await client.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (otpError) throw new Error(`verifyOtp failed: ${otpError.message}`);

  return { id: created.user.id, email, client };
}

export function anonClient(): UserClient {
  const { url, anonKey } = publicSupabaseEnv();
  return createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Creates a company owned by `user` through the same RPC the app uses. Returns the organization id. */
export async function createCompany(user: TestUser, name: string): Promise<string> {
  const { data, error } = await user.client.rpc("create_organization", {
    org_name: name,
    org_industry: "auto_dealer",
    team_name: "Front office",
    member_display_name: `${name} owner`,
    org_time_zone: "America/Chicago",
  });
  if (error) throw new Error(`create_organization failed: ${error.message}`);
  return data;
}

/** Deletes test users (cascading their memberships and rounds) and their companies. */
export async function cleanup(users: TestUser[], organizationIds: string[]): Promise<void> {
  if (organizationIds.length > 0) await admin.from("organizations").delete().in("id", organizationIds);
  await Promise.all(users.map((u) => admin.auth.admin.deleteUser(u.id)));
}

/** Plays a whole round on the server, answering "scam" to everything. Returns its id and cards. */
export async function playRound(userId: string, now: Date) {
  const round = await startRound(admin, userId, { now });
  for (let i = round.answered.length; i < round.cards.length; i++) {
    await submitAnswer(admin, userId, round.roundId, i, "scam");
  }
  const finished = await finishRound(admin, userId, round.roundId);
  return { ...round, finished };
}

/** Adds `user` to the company that `owner` owns, through a real invite. */
export async function joinCompany(owner: TestUser, user: TestUser, organizationId: string, displayName: string): Promise<void> {
  const { data: invite, error } = await owner.client
    .from("invites")
    .insert({ organization_id: organizationId, created_by: owner.id })
    .select("token")
    .single();
  if (error) throw error;
  const joined = await user.client.rpc("accept_invite", { invite_token: invite.token, member_display_name: displayName });
  if (joined.error) throw joined.error;
}

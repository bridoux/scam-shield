"use server";

import { getUser } from "@/lib/auth";
import { finishRound, PlayError, startRound, submitAnswer } from "@/lib/play/core";
import type { AnsweredCard, FinishedRound, PlayResponse, StartedRound } from "@/lib/play/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Verdict } from "@/lib/types";

async function run<T>(action: string, fn: (userId: string) => Promise<T>): Promise<PlayResponse<T>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "not_signed_in" };
  try {
    return { ok: true, data: await fn(user.id) };
  } catch (error: unknown) {
    if (error instanceof PlayError && error.code !== "server_error") return { ok: false, error: error.code };
    console.error(`[play] ${action} failed`, error);
    return { ok: false, error: "server_error" };
  }
}

export async function startRoundAction(): Promise<PlayResponse<StartedRound>> {
  return run("start", (userId) => startRound(createAdminClient(), userId));
}

export async function submitAnswerAction(
  roundId: string,
  position: number,
  choice: Verdict,
): Promise<PlayResponse<AnsweredCard>> {
  return run("answer", (userId) => submitAnswer(createAdminClient(), userId, String(roundId), Number(position), choice));
}

export async function finishRoundAction(roundId: string): Promise<PlayResponse<FinishedRound>> {
  return run("finish", (userId) => finishRound(createAdminClient(), userId, String(roundId)));
}

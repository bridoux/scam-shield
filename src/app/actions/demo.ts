"use server";

import { getScenarios } from "@/lib/content";
import { PlayError } from "@/lib/play/core";
import { answerDemoCard, startDemoRound } from "@/lib/play/demo";
import type { AnsweredCard, PlayResponse, StartedRound } from "@/lib/play/types";
import type { Verdict } from "@/lib/types";
import { logError } from "@/lib/errors/report";

const LOCALE = "en-US";

/** Encrypts demo round tokens. Falls back to the service role key so no extra env var is required. */
function demoSecret(): string {
  const secret = process.env.DEMO_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing DEMO_SECRET (or SUPABASE_SERVICE_ROLE_KEY) for the demo round.");
  return secret;
}

function respond<T>(action: string, fn: () => T): PlayResponse<T> {
  try {
    return { ok: true, data: fn() };
  } catch (error: unknown) {
    if (error instanceof PlayError && error.code !== "server_error") return { ok: false, error: error.code };
    logError(`demo.${action}`, error);
    return { ok: false, error: "server_error" };
  }
}

export async function startDemoAction(): Promise<PlayResponse<StartedRound>> {
  return respond("start", () => startDemoRound(getScenarios(LOCALE), demoSecret()));
}

export async function answerDemoAction(
  token: string,
  position: number,
  choice: Verdict,
  previousStreak: number,
): Promise<PlayResponse<AnsweredCard>> {
  return respond("answer", () =>
    answerDemoCard(getScenarios(LOCALE), demoSecret(), String(token), Number(position), choice, Number(previousStreak)),
  );
}

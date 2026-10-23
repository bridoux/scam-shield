/**
 * The public demo, played without sign-in or a database. The round's scenario ids
 * travel in an encrypted token so the browser holds no answers before it commits,
 * the same guarantee as signed-in play. Nothing is saved.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { pickRound, scoreAnswer, ROUND_SIZE, type Rng } from "../round";
import { toPublicCard, toReveal, type Scenario, type Verdict } from "../types";
import { PlayError } from "./core";
import type { AnsweredCard, StartedRound } from "./types";

/** A demo round stays answerable for this long. */
const DEMO_TTL_MS = 2 * 60 * 60 * 1000;
const IV_BYTES = 12;
const TAG_BYTES = 16;

interface DemoPayload {
  ids: string[];
  exp: number;
}

function keyFrom(secret: string): Buffer {
  if (!secret) throw new Error("Missing demo secret");
  return createHash("sha256").update(`scam-shield demo v1:${secret}`).digest();
}

export function sealDemo(payload: DemoPayload, secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64url");
}

/** Decrypts and checks a demo token; throws PlayError("not_found") if it was altered or has expired. */
export function openDemo(token: string, secret: string, now = Date.now()): DemoPayload {
  try {
    const raw = Buffer.from(token, "base64url");
    const iv = raw.subarray(0, IV_BYTES);
    const tag = raw.subarray(raw.length - TAG_BYTES);
    const body = raw.subarray(IV_BYTES, raw.length - TAG_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), iv);
    decipher.setAuthTag(tag);
    const payload = JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8")) as DemoPayload;
    if (!Array.isArray(payload.ids) || typeof payload.exp !== "number" || payload.exp < now) throw new Error("expired");
    return payload;
  } catch {
    throw new PlayError("not_found");
  }
}

export function startDemoRound(pool: readonly Scenario[], secret: string, now = Date.now(), rng: Rng = Math.random): StartedRound {
  const picked = pickRound(pool, { rng });
  if (picked.length === 0) throw new PlayError("no_scenarios");
  const token = sealDemo({ ids: picked.map((s) => s.id), exp: now + DEMO_TTL_MS }, secret);
  return { roundId: token, isPractice: true, cards: picked.map(toPublicCard), answered: [] };
}

/**
 * Reveals one card. The demo keeps no state, so the client reports its running streak;
 * that only affects demo points, which are never saved.
 */
export function answerDemoCard(
  pool: readonly Scenario[],
  secret: string,
  token: string,
  position: number,
  choice: Verdict,
  previousStreak: number,
  now = Date.now(),
): AnsweredCard {
  if (
    !Number.isInteger(position) ||
    !Number.isInteger(previousStreak) ||
    previousStreak < 0 ||
    previousStreak > ROUND_SIZE ||
    (choice !== "legit" && choice !== "scam")
  ) {
    throw new PlayError("invalid_input");
  }
  const { ids } = openDemo(token, secret, now);
  const scenario = pool.find((s) => s.id === ids[position]);
  if (!scenario) throw new PlayError("not_found");
  return { position, reveal: toReveal(scenario), result: scoreAnswer(scenario, choice, previousStreak) };
}

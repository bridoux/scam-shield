/** A Supabase request that takes longer than this fails instead of hanging. */
export const SUPABASE_TIMEOUT_MS = 10_000;

/** A fetch that gives up after `timeoutMs`, combined with any signal the caller passes. */
export function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return (input, init = {}) => {
    const deadline = AbortSignal.timeout(timeoutMs);
    const signal = init.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
    return fetch(input, { ...init, signal });
  };
}

/**
 * fetch with a deadline for the Supabase clients. Without one, a stalled connection leaves
 * a player stuck on "Checking…"; with it the call fails, the player sees a retry message,
 * and answering again is safe because answers are idempotent.
 */
export const fetchWithTimeout = createTimeoutFetch(SUPABASE_TIMEOUT_MS);

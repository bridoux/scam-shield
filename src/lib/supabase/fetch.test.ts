import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimeoutFetch } from "./fetch";

/** A fetch that never answers unless its signal aborts. */
function hangingFetch() {
  return vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    });
  });
}

describe("createTimeoutFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fails a request that hangs past the deadline", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    await expect(createTimeoutFetch(20)("https://db.example/rest/v1/rounds")).rejects.toMatchObject({
      name: "TimeoutError",
    });
  });

  it("still honours the caller's own abort signal", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const controller = new AbortController();
    const pending = createTimeoutFetch(5_000)("https://db.example/rest/v1/rounds", { signal: controller.signal });
    controller.abort(new Error("cancelled"));
    await expect(pending).rejects.toThrow("cancelled");
  });

  it("passes successful responses through", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ok")));
    const res = await createTimeoutFetch(5_000)("https://db.example/rest/v1/rounds");
    expect(await res.text()).toBe("ok");
  });
});

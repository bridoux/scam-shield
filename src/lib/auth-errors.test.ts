import { describe, expect, it } from "vitest";
import { classifySignInError } from "./auth-errors";

describe("classifySignInError", () => {
  it("reads the per-address cooldown and how long to wait", () => {
    expect(
      classifySignInError({
        status: 429,
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 15 seconds.",
      }),
    ).toEqual({ kind: "cooldown", seconds: 15 });
  });

  it("recognises the project's hourly email limit", () => {
    expect(
      classifySignInError({ status: 429, code: "over_email_send_rate_limit", message: "email rate limit exceeded" }),
    ).toEqual({ kind: "hourlyLimit" });
    expect(classifySignInError({ message: "Email rate limit exceeded" })).toEqual({ kind: "hourlyLimit" });
  });

  it("treats too many requests from one network as a short wait", () => {
    expect(classifySignInError({ status: 429, code: "over_request_rate_limit", message: "Request rate limit reached" })).toEqual({
      kind: "cooldown",
      seconds: null,
    });
  });

  it("falls back to a generic failure for anything else", () => {
    expect(classifySignInError({ status: 500, code: "unexpected_failure", message: "Error sending magic link email" })).toEqual({
      kind: "failed",
    });
    expect(classifySignInError({})).toEqual({ kind: "failed" });
  });
});

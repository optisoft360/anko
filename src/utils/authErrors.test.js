import { describe, expect, it } from "vitest";
import { isAuthFailure } from "./authErrors";

describe("isAuthFailure (C3 / F-07)", () => {
  it("only a 401 about the token ends the session", () => {
    expect(isAuthFailure({ response: { status: 401, data: { detail: "Invalid token." } } })).toBe(true);
    expect(isAuthFailure({ response: { status: 401, data: { detail: "Authentication credentials were not provided." } } })).toBe(true);
    expect(isAuthFailure({ response: { status: 401 } })).toBe(true);
    expect(isAuthFailure({ response: { status: 403, data: { detail: "Trainer role or higher required." } } })).toBe(false);
    expect(isAuthFailure({ response: { status: 429, data: { detail: "Request was throttled." } } })).toBe(false);
    expect(isAuthFailure({ response: { status: 500 } })).toBe(false);
    expect(isAuthFailure(new Error("Network Error"))).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { fetchWithRateLimitRetry, installRateLimitRetry, MAX_RETRIES, RATE_LIMIT_EVENT, retryDelayMs } from "./rateLimit";
import { isAuthFailure } from "@/utils/authErrors";

const tooMany = (config, retryAfter = "1") => Object.assign(new Error("429"), {
  config, response: { status: 429, headers: { "retry-after": retryAfter }, data: { detail: "Request was throttled." } },
});

describe("retryDelayMs", () => {
  it("honours Retry-After seconds and dates, capped", () => {
    expect(retryDelayMs("3", 0)).toBe(3000);
    expect(retryDelayMs(new Date(10_000).toUTCString(), 0, 6_000)).toBe(4000);
    expect(retryDelayMs("600", 0)).toBe(15_000);
  });
  it("backs off exponentially without the header", () => {
    expect(retryDelayMs(undefined, 0)).toBe(1000);
    expect(retryDelayMs(null, 1)).toBe(2000);
  });
});

describe("axios 429 interceptor", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("retries a GET after Retry-After and then succeeds", async () => {
    let calls = 0;
    const instance = axios.create({
      adapter: async (config) => {
        calls += 1;
        if (calls === 1) throw tooMany(config, "2");
        return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config };
      },
    });
    installRateLimitRetry(instance);
    const notice = vi.fn();
    window.addEventListener(RATE_LIMIT_EVENT, notice);
    const p = instance.get("/x");
    await vi.advanceTimersByTimeAsync(1999);
    expect(calls).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(p).resolves.toMatchObject({ data: { ok: true } });
    expect(calls).toBe(2);
    expect(notice).toHaveBeenCalledTimes(1);
    window.removeEventListener(RATE_LIMIT_EVENT, notice);
  });

  it("gives up after MAX_RETRIES and never on writes", async () => {
    let calls = 0;
    const instance = axios.create({ adapter: async (config) => { calls += 1; throw tooMany(config, "0"); } });
    installRateLimitRetry(instance);
    const get = instance.get("/x").catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await get;
    expect(calls).toBe(MAX_RETRIES + 1);
    expect(err.response.status).toBe(429);

    calls = 0;
    const post = instance.post("/x", {}).catch((e) => e);
    await vi.runAllTimersAsync();
    await post;
    expect(calls).toBe(1);
  });

  it("a 429 is never treated as an authentication failure (no logout)", () => {
    expect(isAuthFailure({ response: { status: 429, data: { detail: "Request was throttled." } } })).toBe(false);
    expect(isAuthFailure({ response: { status: 401, data: { detail: "Invalid token." } } })).toBe(true);
  });
});

describe("fetch 429 retry", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("retries GETs answered 429", async () => {
    const responses = [new Response("", { status: 429, headers: { "Retry-After": "1" } }), new Response("{}", { status: 200 })];
    const doFetch = vi.fn(async () => responses.shift());
    const p = fetchWithRateLimitRetry(doFetch, "GET");
    await vi.advanceTimersByTimeAsync(1000);
    expect((await p).status).toBe(200);
    expect(doFetch).toHaveBeenCalledTimes(2);
  });
});

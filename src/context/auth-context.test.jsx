import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";

afterEach(() => { cleanup(); localStorage.clear(); vi.useRealTimers(); });

const auth = vi.hoisted(() => ({ me: vi.fn(), myContext: vi.fn().mockResolvedValue({ has_company: false, companies: [] }) }));
vi.mock("../services/authService", () => ({ default: { me: auth.me, logout: vi.fn(), meContext: auth.myContext, getContext: auth.myContext } }));
vi.mock("../services/rbacService", () => ({ default: { fetchAllowedRoutes: vi.fn().mockResolvedValue({ allowed_routes: [], is_admin: false }) } }));
vi.mock("../services/api", () => ({ setAuthToken: vi.fn(), default: {} }));

const { AuthProvider, useAuth } = await import("./auth-context");

function Probe({ onState }) { onState(useAuth()); return null; }

describe("session bootstrap (F-07)", () => {
  it("keeps the token when /auth/me/ is throttled and recovers on retry", async () => {
    localStorage.setItem("token", "t1");
    auth.me.mockRejectedValueOnce({ response: { status: 429, data: { detail: "Request was throttled." } } })
      .mockResolvedValue({ id: 1, username: "qa" });
    let state;
    render(<AuthProvider><Probe onState={(s) => { state = s; }} /></AuthProvider>);
    await waitFor(() => expect(state.loading).toBe(false), { timeout: 5000 });
    expect(localStorage.getItem("token")).toBe("t1");
    expect(state.user?.username).toBe("qa");
  });

  it("clears the token on an invalid token (401)", async () => {
    localStorage.setItem("token", "bad");
    auth.me.mockReset();
    auth.me.mockRejectedValue({ response: { status: 401, data: { detail: "Invalid token." } } });
    let state;
    render(<AuthProvider><Probe onState={(s) => { state = s; }} /></AuthProvider>);
    await waitFor(() => expect(state.loading).toBe(false), { timeout: 5000 });
    expect(localStorage.getItem("token")).toBeNull();
    expect(auth.me).toHaveBeenCalledTimes(1); // no retries for an auth failure
  });
});

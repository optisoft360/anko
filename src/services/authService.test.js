import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ post: vi.fn(), setAuthToken: vi.fn() }));
vi.mock("./api", () => ({ default: { post: mocks.post, get: vi.fn() }, setAuthToken: mocks.setAuthToken }));

const { default: authService } = await import("./authService");

describe("authService session (C3)", () => {
  it("keeps the session with the new token after a password change", async () => {
    mocks.post.mockResolvedValue({ data: { ok: true, token: "new-token" } });
    await authService.changePassword({ old_password: "a", new_password: "b" });
    expect(mocks.setAuthToken).toHaveBeenCalledWith("new-token");
  });

  it("logout asks the server to delete the token and clears it locally", () => {
    localStorage.setItem("token", "t");
    mocks.post.mockReturnValue(Promise.resolve({}));
    authService.logout();
    expect(mocks.post).toHaveBeenCalledWith("/auth/logout/");
    expect(mocks.setAuthToken).toHaveBeenCalledWith(null);
  });
});

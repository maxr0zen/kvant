import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getStoredToken: vi.fn(),
  clearStoredToken: vi.fn(),
  clearStoredRole: vi.fn(),
  clearStoredUser: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => authMocks);

import { apiFetch, setOn401 } from "@/lib/api/client";

describe("api client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("adds auth header and json body", async () => {
    authMocks.getStoredToken.mockReturnValue("tok1");
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({}),
    });

    await apiFetch("/api/tasks/1/", {
      method: "POST",
      body: { code: "print(1)" },
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toContain("/api/tasks/1/");
    expect(options.headers.Authorization).toBe("Bearer tok1");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.body).toBe(JSON.stringify({ code: "print(1)" }));
  });

  it("skipAuth removes Authorization header", async () => {
    authMocks.getStoredToken.mockReturnValue("tok1");
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({}),
    });

    await apiFetch("/api/tracks/", {
      skipAuth: true,
      headers: { Authorization: "Bearer should-be-removed" },
    });

    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("handles 401: clears auth and calls on401 callback", async () => {
    authMocks.getStoredToken.mockReturnValue("tok1");
    const on401 = vi.fn();
    setOn401(on401);
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({}),
    });

    await apiFetch("/api/auth/profile/");

    expect(authMocks.clearStoredToken).toHaveBeenCalledTimes(1);
    expect(authMocks.clearStoredRole).toHaveBeenCalledTimes(1);
    expect(authMocks.clearStoredUser).toHaveBeenCalledTimes(1);
    expect(on401).toHaveBeenCalledTimes(1);
  });
});


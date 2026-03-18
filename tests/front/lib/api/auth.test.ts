import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  hasApi: vi.fn(),
}));

vi.mock("@/lib/api/client", () => clientMocks);

import {
  clearStoredRole,
  clearStoredToken,
  getStoredRole,
  getStoredToken,
  getStoredUser,
  login,
  setStoredRole,
  setStoredToken,
  setStoredUser,
} from "@/lib/api/auth";

describe("auth API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clientMocks.hasApi.mockReturnValue(true);
  });

  it("login trims username and maps response", async () => {
    clientMocks.apiFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "jwt-token",
        user: {
          id: 7,
          username: "u1",
          first_name: "N",
          last_name: "S",
          full_name: "N S",
          role: "student",
        },
      }),
    });

    const result = await login({ username: "  u1  ", password: "p" });
    expect(result.token).toBe("jwt-token");
    expect(result.user.id).toBe("7");
    expect(clientMocks.apiFetch).toHaveBeenCalledWith(
      "/api/auth/login/",
      expect.objectContaining({
        method: "POST",
        skipAuth: true,
        body: { username: "u1", password: "p" },
      }),
    );
  });

  it("login throws validation error for empty username", async () => {
    await expect(login({ username: "   ", password: "x" })).rejects.toThrow("Введите логин");
    expect(clientMocks.apiFetch).not.toHaveBeenCalled();
  });

  it("login uses backend detail for non-ok response", async () => {
    clientMocks.apiFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Invalid credentials" }),
    });

    await expect(login({ username: "u1", password: "bad" })).rejects.toThrow("Invalid credentials");
  });

  it("token and role storage helpers work", () => {
    setStoredToken("t1");
    setStoredRole("teacher");
    expect(getStoredToken()).toBe("t1");
    expect(getStoredRole()).toBe("teacher");
    clearStoredToken();
    clearStoredRole();
    expect(getStoredToken()).toBeNull();
    expect(getStoredRole()).toBeNull();
  });

  it("stored user helper reads/writes structured payload", () => {
    setStoredUser({
      first_name: "A",
      last_name: "B",
      username: "ab",
      full_name: "A B",
    });
    expect(getStoredUser()).toEqual({
      first_name: "A",
      last_name: "B",
      username: "ab",
      full_name: "A B",
    });
  });
});


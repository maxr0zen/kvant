import { apiFetch, hasApi } from "@/lib/api/client";

// Mock data removed - use backend API only

export interface LoginPayload {
  username: string;
  password: string;
}

export type UserRole = "superuser" | "teacher" | "student";

export interface AuthResponse {
  token: string;
  user: { id: string; username: string; first_name: string; last_name: string; full_name: string; role?: UserRole };
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  if (!payload.username?.trim()) {
    throw new Error("Введите логин");
  }
  if (hasApi()) {
    const res = await apiFetch("/api/auth/login/", {
      method: "POST",
      body: { username: payload.username.trim(), password: payload.password },
      skipAuth: true,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(
        typeof data.detail === "string" ? data.detail : "Неверный логин или пароль."
      );
    }
    const data = await res.json();
    return {
      token: data.token,
      user: {
        id: String(data.user.id),
        username: data.user.username,
        first_name: data.user.first_name,
        last_name: data.user.last_name,
        full_name: data.user.full_name,
        role: data.user.role ?? undefined,
      },
    };
  }
  return loginStub(payload);
}

export async function loginStub(payload: LoginPayload): Promise<AuthResponse> {
  await new Promise((r) => setTimeout(r, 500));
  if (!payload.username?.trim()) {
    throw new Error("Введите логин");
  }
  return {
    token: "",
    user: { id: "", username: "", first_name: "", last_name: "", full_name: "", role: "student" },
  };
}

export function getStoredRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  const r = localStorage.getItem("user_role");
  return r === "superuser" || r === "teacher" || r === "student" ? r : null;
}

export function setStoredRole(role: UserRole): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("user_role", role);
}

export function clearStoredRole(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("user_role");
}

export interface StoredUser {
  first_name: string;
  last_name: string;
  username: string;
  full_name: string;
}

const USER_STORAGE_KEY = "user_info";

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredUser;
    return data?.first_name != null && data?.last_name != null && data?.username != null ? data : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ 
    first_name: user.first_name, 
    last_name: user.last_name, 
    username: user.username,
    full_name: user.full_name 
  }));
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth_token", token);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
}

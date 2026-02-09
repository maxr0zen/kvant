/**
 * API пользователей (список, создание учителя/ученика). Только для superuser.
 */

import { apiFetch, hasApi } from "@/lib/api/client";
import { getStoredToken } from "@/lib/api/auth";

export interface UserListItem {
  id: string;
  username: string;
  name: string;
  role: string;
  group_id: string | null;
  group_ids: string[];
  created_at: string;
}

export interface CreateUserPayload {
  username: string;
  name: string;
  password: string;
  role: "teacher" | "student";
  group_id?: string | null;
  group_ids?: string[];
}

export interface UpdateUserPayload {
  name?: string;
  group_id?: string | null;
  group_ids?: string[];
}

export async function fetchUsers(): Promise<UserListItem[]> {
  if (!hasApi() || !getStoredToken()) return [];
  try {
    const res = await apiFetch("/api/auth/users/");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createUser(payload: CreateUserPayload): Promise<UserListItem> {
  const body: Record<string, unknown> = {
    username: payload.username.trim(),
    name: payload.name.trim(),
    password: payload.password,
    role: payload.role,
  };
  if (payload.role === "student" && payload.group_id != null) {
    body.group_id = payload.group_id || null;
  }
  if (payload.role === "teacher" && payload.group_ids?.length) {
    body.group_ids = payload.group_ids;
  }
  const res = await apiFetch("/api/auth/users/", {
    method: "POST",
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      err.username && Array.isArray(err.username)
        ? err.username[0]
        : err.detail ?? "Ошибка создания пользователя";
    throw new Error(typeof msg === "string" ? msg : "Ошибка создания пользователя");
  }
  return res.json();
}

export async function resetStudentPassword(userId: string): Promise<{ username: string; password: string }> {
  const res = await apiFetch(`/api/auth/users/${userId}/reset-password/`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.detail ?? "Ошибка сброса пароля";
    throw new Error(typeof msg === "string" ? msg : "Ошибка сброса пароля");
  }
  return res.json();
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<UserListItem> {
  const res = await apiFetch(`/api/auth/users/${id}/`, {
    method: "PATCH",
    body: payload,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.detail ?? "Ошибка обновления пользователя";
    throw new Error(typeof msg === "string" ? msg : "Ошибка обновления пользователя");
  }
  return res.json();
}

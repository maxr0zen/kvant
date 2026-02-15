/**
 * API пользователей (список, создание учителя/ученика). Только для superuser.
 */

import { apiFetch, hasApi } from "@/lib/api/client";
import { getStoredToken } from "@/lib/api/auth";

export interface UserListItem {
  id: string;
  username: string;
  name: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role: string;
  group_id: string | null;
  group_ids: string[];
  created_at: string;
}

export interface CreateUserPayload {
  username: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  password: string;
  role: "teacher" | "student";
  group_id?: string | null;
  group_ids?: string[];
}

export interface TeacherCreateStudentPayload {
  username: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface UpdateUserPayload {
  name?: string;
  first_name?: string;
  last_name?: string;
  group_id?: string | null;
  group_ids?: string[];
}

export async function fetchUsers(): Promise<UserListItem[]> {
  if (!hasApi() || !getStoredToken()) return [];
  try {
    const res = await apiFetch("/api/auth/users/");
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    return list.map((u: UserListItem & { full_name?: string }) => ({
      ...u,
      name: u.full_name ?? ([u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.username),
    }));
  } catch {
    return [];
  }
}

export async function createUser(payload: CreateUserPayload): Promise<UserListItem> {
  const first = payload.first_name ?? (payload.name ? (payload.name.trim().split(/\s+/)[0] ?? "") : "");
  const last = payload.last_name ?? (payload.name ? (payload.name.trim().split(/\s+/).slice(1).join(" ") || (payload.name.trim().split(/\s+/)[0] ?? "")) : "");
  const body: Record<string, unknown> = {
    username: payload.username.trim(),
    first_name: first,
    last_name: last,
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

export async function createStudentInGroup(
  groupId: string,
  payload: TeacherCreateStudentPayload
): Promise<UserListItem> {
  const res = await apiFetch(`/api/auth/teacher/groups/${groupId}/students/`, {
    method: "POST",
    body: {
      username: payload.username.trim(),
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      password: payload.password,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      err.username && Array.isArray(err.username)
        ? err.username[0]
        : err.detail ?? "Ошибка создания ученика";
    throw new Error(typeof msg === "string" ? msg : "Ошибка создания ученика");
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
  const body: Record<string, unknown> = { ...payload };
  if (payload.name !== undefined && (payload.first_name === undefined || payload.last_name === undefined)) {
    const parts = payload.name.trim().split(/\s+/);
    body.first_name = parts[0] ?? "";
    body.last_name = (parts.slice(1).join(" ") || parts[0]) ?? "";
  }
  delete (body as Record<string, unknown>).name;
  const res = await apiFetch(`/api/auth/users/${id}/`, {
    method: "PATCH",
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.detail ?? "Ошибка обновления пользователя";
    throw new Error(typeof msg === "string" ? msg : "Ошибка обновления пользователя");
  }
  return res.json();
}

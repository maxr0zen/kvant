/**
 * API групп. Только для superuser.
 */

import { apiFetch, hasApi } from "@/lib/api/client";
import { getStoredToken } from "@/lib/api/auth";

export interface GroupItem {
  id: string;
  title: string;
  order: number;
}

export interface CreateGroupPayload {
  title: string;
  order?: number;
}

export async function fetchGroups(): Promise<GroupItem[]> {
  if (!hasApi() || !getStoredToken()) return [];
  try {
    const res = await apiFetch("/api/groups/");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function createGroup(payload: CreateGroupPayload): Promise<GroupItem> {
  const res = await apiFetch("/api/groups/", {
    method: "POST",
    body: {
      title: payload.title.trim(),
      order: payload.order ?? 0,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.detail ?? "Ошибка создания группы";
    throw new Error(typeof msg === "string" ? msg : "Ошибка создания группы");
  }
  return res.json();
}

export async function updateGroup(id: string, payload: Partial<CreateGroupPayload>): Promise<GroupItem> {
  const res = await apiFetch(`/api/groups/${id}/`, {
    method: "PATCH",
    body: payload,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.detail ?? "Ошибка обновления группы";
    throw new Error(typeof msg === "string" ? msg : "Ошибка обновления группы");
  }
  return res.json();
}

export async function deleteGroup(id: string): Promise<void> {
  const res = await apiFetch(`/api/groups/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.detail ?? "Ошибка удаления группы";
    throw new Error(typeof msg === "string" ? msg : "Ошибка удаления группы");
  }
}

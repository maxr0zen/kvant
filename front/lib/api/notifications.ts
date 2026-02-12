/**
 * Notifications API. Fetched for main page; create from admin.
 */

import { apiFetch, hasApi } from "@/lib/api/client";

export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  message: string;
  group_ids: string[];
  level: NotificationLevel;
  created_at: string;
  /** До какого времени (ISO) показывать. null — без ограничения. */
  available_until?: string | null;
}

export async function fetchNotifications(token?: string | null): Promise<Notification[]> {
  if (!hasApi()) return [];
  try {
    const res = await apiFetch("/api/notifications/", { token: token ?? undefined });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((n: Record<string, unknown>) => ({
          id: String(n.id),
          message: String(n.message ?? ""),
          group_ids: Array.isArray(n.group_ids) ? (n.group_ids as string[]) : [],
          level: (n.level as NotificationLevel) || "info",
          created_at: String(n.created_at ?? ""),
          available_until: n.available_until != null ? String(n.available_until) : null,
        }))
      : [];
  } catch {
    return [];
  }
}

export interface CreateNotificationPayload {
  message: string;
  group_ids?: string[];
  level?: NotificationLevel;
  /** Показывать до этой даты/времени (ISO). Не задано — без ограничения. */
  available_until?: string | null;
  /** Вместо available_until: показывать N минут с момента создания. */
  duration_minutes?: number | null;
}

export type UpdateNotificationPayload = CreateNotificationPayload;

export async function createNotification(
  payload: CreateNotificationPayload,
  token?: string | null
): Promise<Notification> {
  const body: Record<string, unknown> = {
    message: payload.message.trim(),
    group_ids: payload.group_ids ?? [],
    level: payload.level ?? "info",
  };
  if (payload.available_until != null && payload.available_until !== "") {
    body.available_until = payload.available_until;
  }
  if (payload.duration_minutes != null && payload.duration_minutes > 0) {
    body.duration_minutes = payload.duration_minutes;
  }
  const res = await apiFetch("/api/notifications/", {
    method: "POST",
    body,
    token: token ?? undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Не удалось создать уведомление");
  }
  const data = await res.json();
  return {
    id: String(data.id),
    message: String(data.message ?? ""),
    group_ids: Array.isArray(data.group_ids) ? data.group_ids : [],
    level: (data.level as NotificationLevel) || "info",
    created_at: String(data.created_at ?? ""),
    available_until: data.available_until != null ? String(data.available_until) : null,
  };
}

export async function updateNotification(
  id: string,
  payload: UpdateNotificationPayload,
  token?: string | null
): Promise<Notification> {
  const body: Record<string, unknown> = {
    message: payload.message.trim(),
    group_ids: payload.group_ids ?? [],
    level: payload.level ?? "info",
  };
  if (payload.available_until !== undefined) {
    body.available_until = payload.available_until;
  }
  if (payload.duration_minutes != null && payload.duration_minutes > 0) {
    body.duration_minutes = payload.duration_minutes;
  }
  const res = await apiFetch(`/api/notifications/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    body,
    token: token ?? undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Не удалось обновить уведомление");
  }
  const data = await res.json();
  return {
    id: String(data.id),
    message: String(data.message ?? ""),
    group_ids: Array.isArray(data.group_ids) ? data.group_ids : [],
    level: (data.level as NotificationLevel) || "info",
    created_at: String(data.created_at ?? ""),
    available_until: data.available_until != null ? String(data.available_until) : null,
  };
}

export async function deleteNotification(id: string, token?: string | null): Promise<void> {
  const res = await apiFetch(`/api/notifications/${encodeURIComponent(id)}/`, {
    method: "DELETE",
    token: token ?? undefined,
  });
  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Не удалось удалить уведомление");
  }
}

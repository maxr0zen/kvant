/**
 * Surveys API (опросы — свободная форма ответа).
 */

import type { Survey } from "@/lib/types";
import { apiFetch, hasApi } from "@/lib/api/client";

export interface SurveyResponseItem {
  user_id: string;
  full_name: string;
  group_id: string;
  group_title: string;
  answer: string;
  created_at: string | null;
}

export interface CreateSurveyPayload {
  title: string;
  prompt?: string;
  trackId?: string;
  visibleGroupIds?: string[];
  availableFrom?: string;
  availableUntil?: string;
}

export async function createSurvey(payload: CreateSurveyPayload, token?: string | null): Promise<Survey> {
  if (!hasApi()) throw new Error("API not configured");
  const res = await apiFetch("/api/surveys/", {
    method: "POST",
    body: {
      title: payload.title,
      prompt: payload.prompt ?? "",
      track_id: payload.trackId ?? "",
      visible_group_ids: payload.visibleGroupIds ?? [],
      available_from: payload.availableFrom ?? null,
      available_until: payload.availableUntil ?? null,
    },
    token: token ?? undefined,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof err.detail === "string") {
      throw new Error(err.detail);
    }
    const msgs = typeof err === "object" && err !== null
      ? Object.entries(err).flatMap(([k, v]) =>
          Array.isArray(v) ? v.map((s) => `${k}: ${String(s)}`) : typeof v === "string" ? [`${k}: ${v}`] : []
        )
      : [];
    throw new Error(msgs.length > 0 ? msgs.join("; ") : "Не удалось создать опрос");
  }
  const data = await res.json();
  return mapSurveyFromApi(data);
}

export async function fetchSurveyById(id: string, token?: string | null): Promise<Survey | null> {
  if (!hasApi()) return null;
  try {
    const res = await apiFetch(`/api/surveys/${encodeURIComponent(id)}/`, { token });
    if (!res.ok) return null;
    const data = await res.json();
    return mapSurveyFromApi(data);
  } catch {
    return null;
  }
}

export async function submitSurveyResponse(surveyId: string, answer: string, token?: string | null): Promise<{ ok: boolean; message?: string }> {
  if (!hasApi()) return { ok: false };
  try {
    const res = await apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/submit/`, {
      method: "POST",
      body: { answer },
      token: token ?? undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(typeof err.detail === "string" ? err.detail : "Не удалось отправить ответ");
    }
    const data = await res.json();
    return { ok: Boolean(data.ok), message: data.message };
  } catch (e) {
    throw e;
  }
}

/** Ответы на опрос (для преподавателя/админа). */
export async function fetchSurveyResponses(surveyId: string, token?: string | null): Promise<SurveyResponseItem[]> {
  if (!hasApi()) return [];
  try {
    const res = await apiFetch(`/api/surveys/${encodeURIComponent(surveyId)}/responses/`, { token });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.responses) ? data.responses : [];
  } catch {
    return [];
  }
}

function mapSurveyFromApi(data: Record<string, unknown>): Survey {
  return {
    id: String(data.id),
    title: String(data.title),
    prompt: String(data.prompt ?? ""),
    trackId: data.track_id != null ? String(data.track_id) : undefined,
    visibleGroupIds: Array.isArray(data.visible_group_ids) ? (data.visible_group_ids as string[]) : undefined,
    availableFrom: data.available_from != null ? String(data.available_from) : undefined,
    availableUntil: data.available_until != null ? String(data.available_until) : undefined,
    canEdit: Boolean(data.can_edit),
    myResponse: data.my_response != null ? String(data.my_response) : undefined,
    isTeacherOrAdmin: Boolean(data.is_teacher_or_admin),
  };
}

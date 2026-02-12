/**
 * Questions API (stubs)
 */

import type { Question, QuestionCheckResult } from "@/lib/types";
import { apiFetch, hasApi } from "@/lib/api/client";

// Mock data removed - use backend API only

export async function fetchQuestionById(id: string, token?: string | null): Promise<Question | null> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/questions/${id}/`, { token });
      if (!res.ok) return null;
      const data = await res.json();
      return mapQuestionFromApi(data);
    } catch {
      return null;
    }
  }
  return null;
}

export async function fetchAllQuestions(token?: string | null): Promise<Question[]> {
  if (hasApi()) {
    try {
      const res = await apiFetch("/api/questions/");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.map((q: Record<string, unknown>) => mapQuestionFromApi(q)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapQuestionFromApi(data: Record<string, unknown>): Question {
  const choices = Array.isArray(data.choices)
    ? (data.choices as Record<string, unknown>[]).map((choice) => ({
        id: String(choice.id),
        text: String(choice.text),
        ...(choice.is_correct !== undefined && { isCorrect: Boolean(choice.is_correct) }),
      }))
    : [];
  return {
    id: String(data.id),
    title: String(data.title),
    prompt: String(data.prompt),
    choices,
    multiple: Boolean(data.multiple),
    trackId: data.track_id != null ? String(data.track_id) : undefined,
    hints: Array.isArray(data.hints) ? (data.hints as string[]) : undefined,
    availableFrom: data.available_from != null ? String(data.available_from) : undefined,
    availableUntil: data.available_until != null ? String(data.available_until) : undefined,
    maxAttempts: data.max_attempts != null ? Number(data.max_attempts) : undefined,
    attemptsUsed: data.attempts_used != null ? Number(data.attempts_used) : undefined,
    canEdit: Boolean(data.can_edit),
  };
}

export async function checkQuestionAnswer(
  questionId: string,
  selected: string[]
): Promise<QuestionCheckResult> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/questions/${questionId}/check/`, {
        method: "POST",
        body: { selected },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка проверки ответа");
      }
      const data = await res.json();
      return {
        passed: Boolean(data.passed),
        message: String(data.message ?? ""),
      };
    } catch (e) {
      throw e;
    }
  }
  return { passed: false, message: "Backend API required" };
}

export type QuestionCreatePayload = Pick<Question, "title" | "prompt" | "choices" | "multiple"> & Partial<Pick<Question, "trackId" | "visibleGroupIds" | "hints" | "availableFrom" | "availableUntil" | "maxAttempts">>;

export async function createQuestion(data: QuestionCreatePayload): Promise<Question> {
  if (!hasApi()) throw new Error("API not configured");
  const body: Record<string, unknown> = {
    title: data.title,
    prompt: data.prompt ?? "",
    choices: (data.choices ?? []).map((c) => ({
      id: c.id,
      text: c.text,
      is_correct: c.isCorrect ?? false,
    })),
    multiple: data.multiple ?? false,
  };
  if (data.trackId !== undefined) body.track_id = data.trackId;
  if (data.visibleGroupIds !== undefined) body.visible_group_ids = data.visibleGroupIds;
  if (data.hints !== undefined) body.hints = data.hints;
  if (data.availableFrom !== undefined) body.available_from = data.availableFrom;
  if (data.availableUntil !== undefined) body.available_until = data.availableUntil;
  if (data.maxAttempts !== undefined) body.max_attempts = data.maxAttempts;
  const res = await apiFetch("/api/questions/", { method: "POST", body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Не удалось создать вопрос");
  }
  const created = await res.json();
  return mapQuestionFromApi(created);
}

export type QuestionUpdatePayload = Partial<Pick<Question, "title" | "prompt" | "trackId" | "choices" | "multiple" | "visibleGroupIds" | "hints" | "availableFrom" | "availableUntil" | "maxAttempts">>;

export async function updateQuestion(id: string, data: QuestionUpdatePayload): Promise<Question> {
  if (!hasApi()) throw new Error("API not configured");
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.prompt !== undefined) body.prompt = data.prompt;
  if (data.trackId !== undefined) body.track_id = data.trackId;
  if (data.choices !== undefined) body.choices = data.choices.map((c) => ({
    id: c.id,
    text: c.text,
    ...(c.isCorrect !== undefined && { is_correct: c.isCorrect }),
  }));
  if (data.multiple !== undefined) body.multiple = data.multiple;
  if (data.visibleGroupIds !== undefined) body.visible_group_ids = data.visibleGroupIds;
  if (data.hints !== undefined) body.hints = data.hints;
  if (data.availableFrom !== undefined) body.available_from = data.availableFrom;
  if (data.availableUntil !== undefined) body.available_until = data.availableUntil;
  if (data.maxAttempts !== undefined) body.max_attempts = data.maxAttempts;
  const res = await apiFetch(`/api/questions/${id}/`, {
    method: "PATCH",
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка обновления вопроса");
  }
  const updated = await res.json();
  return mapQuestionFromApi(updated);
}

export async function deleteQuestion(id: string): Promise<void> {
  if (!hasApi()) throw new Error("API not configured");
  const res = await apiFetch(`/api/questions/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка удаления вопроса");
  }
}

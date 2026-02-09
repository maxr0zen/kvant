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
      }))
    : [];
  return {
    id: String(data.id),
    title: String(data.title),
    prompt: String(data.prompt),
    choices,
    multiple: Boolean(data.multiple),
    trackId: data.track_id != null ? String(data.track_id) : undefined,
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

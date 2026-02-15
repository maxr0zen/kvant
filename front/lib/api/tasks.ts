/**
 * Tasks API. With NEXT_PUBLIC_API_URL uses backend; otherwise stubs.
 */

import type { Task, SubmitResult, TestRunResult } from "@/lib/types";
import { getStoredToken } from "@/lib/api/auth";
import { apiFetch, hasApi } from "@/lib/api/client";

function mapTaskFromApi(data: Record<string, unknown>): Task {
  const testCases = Array.isArray(data.test_cases)
    ? (data.test_cases as Record<string, unknown>[]).map((tc) => ({
        id: String(tc.id),
        input: String(tc.input ?? ""),
        expectedOutput: String(tc.expected_output ?? ""),
        isPublic: Boolean(tc.is_public !== false),
      }))
    : [];
  return {
    id: String(data.id),
    title: String(data.title),
    description: String(data.description ?? ""),
    starterCode: String(data.starter_code ?? ""),
    language: data.language != null ? String(data.language) : undefined,
    trackId: data.track_id != null ? String(data.track_id) : undefined,
    testCases,
    hard: Boolean(data.hard),
    visibleGroupIds: Array.isArray(data.visible_group_ids) ? (data.visible_group_ids as string[]) : undefined,
    hints: Array.isArray(data.hints) ? (data.hints as string[]) : undefined,
    availableFrom: data.available_from != null ? String(data.available_from) : undefined,
    availableUntil: data.available_until != null ? String(data.available_until) : undefined,
    maxAttempts: data.max_attempts != null ? Number(data.max_attempts) : undefined,
    attemptsUsed: data.attempts_used != null ? Number(data.attempts_used) : undefined,
    canEdit: Boolean(data.can_edit),
  };
}

function mapResultFromApi(r: Record<string, unknown>): TestRunResult {
  return {
    caseId: String(r.caseId ?? r.case_id ?? ""),
    passed: Boolean(r.passed),
    actualOutput: r.actualOutput != null ? String(r.actualOutput) : r.actual_output != null ? String(r.actual_output) : undefined,
    error: r.error != null ? String(r.error) : undefined,
  };
}

/** token — для SSR (передайте из cookies()), чтобы бэкенд вернул can_edit */
export async function fetchTaskById(id: string, token?: string | null): Promise<Task | null> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/tasks/${id}/`, { token: token ?? undefined });
      if (!res.ok) return fetchTaskByIdStub(id);
      const data = await res.json();
      return mapTaskFromApi(data);
    } catch {
      return fetchTaskByIdStub(id);
    }
  }
  return fetchTaskByIdStub(id);
}

export async function createTask(data: Omit<Task, "id">): Promise<Task> {
  if (hasApi()) {
    try {
      const res = await apiFetch("/api/tasks/", {
        method: "POST",
        body: {
          title: data.title,
          description: data.description ?? "",
          starter_code: data.starterCode ?? "",
          language: data.language ?? "python",
          track_id: data.trackId ?? null,
          test_cases: (data.testCases ?? []).map((tc) => ({
            id: tc.id,
            input: tc.input,
            expected_output: tc.expectedOutput,
            is_public: tc.isPublic,
          })),
          visible_group_ids: data.visibleGroupIds ?? [],
          hard: data.hard ?? false,
          hints: data.hints ?? [],
          available_from: data.availableFrom ?? null,
          available_until: data.availableUntil ?? null,
          max_attempts: data.maxAttempts ?? null,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка создания задачи");
      }
      const created = await res.json();
      return mapTaskFromApi(created);
    } catch (e) {
      throw e;
    }
  }
  return createTaskStub(data);
}

export type TaskUpdatePayload = Partial<Pick<Task, "title" | "description" | "starterCode" | "language" | "testCases" | "trackId" | "hard" | "visibleGroupIds" | "hints" | "availableFrom" | "availableUntil" | "maxAttempts">>;

export async function updateTask(id: string, data: TaskUpdatePayload): Promise<Task> {
  if (!hasApi()) throw new Error("API not configured");
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.starterCode !== undefined) body.starter_code = data.starterCode;
  if (data.language !== undefined) body.language = data.language;
  if (data.trackId !== undefined) body.track_id = data.trackId;
  if (data.testCases !== undefined) body.test_cases = data.testCases.map((tc) => ({ id: tc.id, input: tc.input, expected_output: tc.expectedOutput, is_public: tc.isPublic }));
  if (data.visibleGroupIds !== undefined) body.visible_group_ids = data.visibleGroupIds;
  if (data.hard !== undefined) body.hard = data.hard;
  if (data.hints !== undefined) body.hints = data.hints;
  if (data.availableFrom !== undefined) body.available_from = data.availableFrom;
  if (data.availableUntil !== undefined) body.available_until = data.availableUntil;
  if (data.maxAttempts !== undefined) body.max_attempts = data.maxAttempts;
  const res = await apiFetch(`/api/tasks/${id}/`, {
    method: "PATCH",
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка обновления задания");
  }
  const updated = await res.json();
  return mapTaskFromApi(updated);
}

export async function deleteTask(id: string): Promise<void> {
  if (!hasApi()) throw new Error("API not configured");
  const res = await apiFetch(`/api/tasks/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка удаления задания");
  }
}

export async function runTask(taskId: string, code: string): Promise<TestRunResult[]> {
  if (!hasApi()) return [];
  try {
    const res = await apiFetch(`/api/tasks/${taskId}/run/`, {
      method: "POST",
      body: { code },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = Array.isArray(data.results) ? data.results : [];
    return raw.map((r: Record<string, unknown>) => mapResultFromApi(r));
  } catch {
    return [];
  }
}

export async function fetchTaskDraft(taskId: string): Promise<string | null> {
  if (!hasApi() || !getStoredToken()) return null;
  try {
    const res = await apiFetch(`/api/tasks/${taskId}/draft/`);
    if (!res.ok) return null;
    const data = (await res.json()) as { code?: string | null };
    return data.code && typeof data.code === "string" ? data.code : null;
  } catch {
    return null;
  }
}

export async function saveTaskDraft(taskId: string, code: string, keepalive = false): Promise<void> {
  if (!hasApi() || !getStoredToken()) return;
  try {
    await apiFetch(`/api/tasks/${taskId}/draft/`, {
      method: "PUT",
      body: { code },
      keepalive,
    });
  } catch {
    // ignore
  }
}

export async function submitTask(taskId: string, code: string): Promise<SubmitResult> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/submit/`, {
        method: "POST",
        body: { code },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка отправки решения");
      }
      const data = await res.json();
      const results = Array.isArray(data.results)
        ? (data.results as Record<string, unknown>[]).map(mapResultFromApi)
        : [];
      return {
        passed: Boolean(data.passed),
        results,
        message: data.message != null ? String(data.message) : undefined,
      };
    } catch (e) {
      throw e;
    }
  }
  throw new Error("API не настроен");
}

export async function fetchTaskByIdStub(id: string): Promise<Task | null> {
  return null;
}

export async function createTaskStub(data: Omit<Task, "id">): Promise<Task> {
  await new Promise((r) => setTimeout(r, 400));
  return {
    ...data,
    id: "t" + Date.now(),
  };
}

export async function runTestsStub(
  _taskId: string,
  code: string,
  testCases: { id: string; input: string; expectedOutput: string }[]
): Promise<TestRunResult[]> {
  await new Promise((r) => setTimeout(r, 800));
  return testCases.map((tc) => {
    const normalizedExpected = tc.expectedOutput.trim();
    const mockPass =
      normalizedExpected === "Hello, World!" &&
      code.includes("Hello") &&
      code.includes("World");
    const mockPassSum =
      normalizedExpected === "3" && code.includes("+") && code.includes("input");
    const passed = mockPass || mockPassSum || Math.random() > 0.5;
    return {
      caseId: tc.id,
      passed,
      actualOutput: passed ? tc.expectedOutput : "Неверный вывод",
      error: passed ? undefined : "Неверный ответ",
    };
  });
}

export async function submitTaskStub(
  taskId: string,
  code: string
): Promise<SubmitResult> {
  const task = await fetchTaskByIdStub(taskId);
  if (!task) {
    return { passed: false, results: [], message: "Задача не найдена" };
  }
  const results = await runTestsStub(taskId, code, task.testCases);
  const passed = results.every((r) => r.passed);
  return {
    passed,
    results,
    message: passed ? "Все тесты пройдены." : "Часть тестов не пройдена.",
  };
}

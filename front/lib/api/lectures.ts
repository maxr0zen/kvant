/**
 * Lectures API. With NEXT_PUBLIC_API_URL uses backend; otherwise stubs.
 */

import type { Lecture } from "@/lib/types";
import { getStoredToken } from "@/lib/api/auth";
import { apiFetch, hasApi } from "@/lib/api/client";

function mapLectureFromApi(data: Record<string, unknown>): Lecture {
  return {
    id: String(data.id),
    title: String(data.title),
    trackId: data.track_id != null ? String(data.track_id) : undefined,
    content: data.content != null ? String(data.content) : undefined,
    blocks: Array.isArray(data.blocks) ? (data.blocks as Lecture["blocks"]) : undefined,
    visibleGroupIds: Array.isArray(data.visible_group_ids) ? (data.visible_group_ids as string[]) : undefined,
    canEdit: Boolean(data.can_edit),
    availableFrom: data.available_from != null ? String(data.available_from) : undefined,
    availableUntil: data.available_until != null ? String(data.available_until) : undefined,
    hints: Array.isArray(data.hints) ? (data.hints as string[]) : undefined,
    maxAttempts: data.max_attempts != null ? Number(data.max_attempts) : undefined,
  };
}

export interface BlockProgressItem {
  status: "completed" | "started" | null;
  correct_ids: string[] | null;
}

export async function fetchLectureQuestionBlocksProgress(
  lectureId: string
): Promise<Record<string, BlockProgressItem>> {
  if (!hasApi()) return {};
  try {
    const res = await apiFetch(`/api/lectures/${lectureId}/question-blocks-progress/`);
    if (!res.ok) return {};
    const data = (await res.json()) as { blocks?: Record<string, { status?: string; correct_ids?: string[] }> };
    const raw = data.blocks ?? {};
    const result: Record<string, BlockProgressItem> = {};
    for (const [bid, v] of Object.entries(raw)) {
      const item = v as { status?: string; correct_ids?: string[] };
      result[bid] = {
        status: (item.status as "completed" | "started") ?? null,
        correct_ids: item.correct_ids ?? null,
      };
    }
    return result;
  } catch {
    return {};
  }
}

export async function checkLectureBlockAnswer(
  lectureId: string,
  blockId: string,
  selected: string[]
): Promise<{ passed: boolean; message: string }> {
  if (!hasApi()) throw new Error("API not configured");
  const res = await apiFetch(`/api/lectures/${lectureId}/check_block_answer/`, {
    method: "POST",
    body: { block_id: blockId, selected },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка проверки");
  }
  const data = await res.json();
  return { passed: Boolean(data.passed), message: String(data.message ?? "") };
}

export async function markLectureViewed(lectureId: string): Promise<void> {
  if (!hasApi()) return;
  try {
    await apiFetch(`/api/lectures/${lectureId}/mark_viewed/`, { method: "POST" });
  } catch {
    // ignore
  }
}

/** token — для SSR (передайте из cookies()), чтобы бэкенд вернул can_edit */
export async function fetchLectureById(id: string, token?: string | null, options?: { cache?: RequestCache }): Promise<Lecture | null> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/lectures/${id}/`, { cache: options?.cache ?? "no-store", token: token ?? undefined });
      if (!res.ok) return fetchLectureByIdStub(id);
      const data = await res.json();
      return mapLectureFromApi(data);
    } catch {
      return fetchLectureByIdStub(id);
    }
  }
  return fetchLectureByIdStub(id);
}

export async function updateLecture(
  id: string,
  data: Partial<Pick<Lecture, "title" | "trackId" | "content" | "blocks" | "visibleGroupIds" | "availableFrom" | "availableUntil" | "hints" | "maxAttempts">>
): Promise<Lecture> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/lectures/${id}/`, {
        method: "PATCH",
        body: {
          ...(data.title != null && { title: data.title }),
          ...(data.trackId != null && { track_id: data.trackId }),
          ...(data.content != null && { content: data.content }),
          ...(data.blocks != null && { blocks: data.blocks }),
          ...(data.visibleGroupIds != null && { visible_group_ids: data.visibleGroupIds }),
          ...(data.availableFrom != null && { available_from: data.availableFrom }),
          ...(data.availableUntil != null && { available_until: data.availableUntil }),
          ...(data.hints != null && { hints: data.hints }),
          ...(data.maxAttempts != null && { max_attempts: data.maxAttempts }),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка обновления лекции");
      }
      const updated = await res.json();
      return mapLectureFromApi(updated);
    } catch (e) {
      throw e;
    }
  }
  throw new Error("API not configured");
}

export async function deleteLecture(id: string): Promise<void> {
  if (!hasApi()) throw new Error("API not configured");
  const res = await apiFetch(`/api/lectures/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка удаления лекции");
  }
}

export async function createLecture(data: Omit<Lecture, "id">): Promise<Lecture> {
  if (hasApi()) {
    try {
      const res = await apiFetch("/api/lectures/", {
        method: "POST",
        body: {
          title: data.title,
          track_id: data.trackId ?? null,
          content: data.content ?? "",
          blocks: data.blocks ?? [],
          visible_group_ids: data.visibleGroupIds ?? [],
          available_from: data.availableFrom ?? null,
          available_until: data.availableUntil ?? null,
          hints: data.hints ?? [],
          max_attempts: data.maxAttempts ?? null,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка создания лекции");
      }
      const created = await res.json();
      return mapLectureFromApi(created);
    } catch (e) {
      throw e;
    }
  }
  return createLectureStub(data);
}

export async function fetchLectureByIdStub(id: string): Promise<Lecture | null> {
  return null;
}

export async function createLectureStub(
  data: Omit<Lecture, "id">
): Promise<Lecture> {
  await new Promise((r) => setTimeout(r, 400));
  return {
    ...data,
    id: "l" + Date.now(),
  };
}

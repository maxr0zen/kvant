/**
 * Lectures API. With NEXT_PUBLIC_API_URL uses backend; otherwise stubs.
 */

import type { Lecture } from "@/lib/types";
import { getStoredToken } from "@/lib/api/auth";
import { apiFetch, hasApi } from "@/lib/api/client";

const MOCK_LECTURES: Record<string, Lecture> = {};

function mapLectureFromApi(data: Record<string, unknown>): Lecture {
  return {
    id: String(data.id),
    title: String(data.title),
    trackId: data.track_id != null ? String(data.track_id) : undefined,
    content: data.content != null ? String(data.content) : undefined,
    blocks: Array.isArray(data.blocks) ? (data.blocks as Lecture["blocks"]) : undefined,
  };
}

export async function fetchLectureById(id: string): Promise<Lecture | null> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/lectures/${id}/`);
      if (!res.ok) return fetchLectureByIdStub(id);
      const data = await res.json();
      return mapLectureFromApi(data);
    } catch {
      return fetchLectureByIdStub(id);
    }
  }
  return fetchLectureByIdStub(id);
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

/**
 * Tracks API. With NEXT_PUBLIC_API_URL uses backend; otherwise stubs.
 */

import type { Track, TrackProgress } from "@/lib/types";
import { getStoredToken } from "@/lib/api/auth";
import { apiFetch, hasApi } from "@/lib/api/client";

// Mock data removed - use backend API only

function mapTrackFromApi(data: Record<string, unknown>): Track {
  return {
    id: String(data.id),
    title: String(data.title),
    description: String(data.description ?? ""),
    lessons: Array.isArray(data.lessons) ? data.lessons as Track["lessons"] : [],
    order: Number(data.order ?? 0),
    progress: data.progress && typeof data.progress === "object" ? (data.progress as TrackProgress) : undefined,
    progressLate: data.progress_late && typeof data.progress_late === "object" ? (data.progress_late as Record<string, number>) : undefined,
    visibleGroupIds: Array.isArray(data.visible_group_ids) ? (data.visible_group_ids as string[]) : undefined,
    canEdit: Boolean(data.can_edit),
  };
}

export interface OrphanLecture {
  id: string;
  title: string;
  available_from?: string | null;
  available_until?: string | null;
}

export interface OrphanTask {
  id: string;
  title: string;
  hard?: boolean;
  available_from?: string | null;
  available_until?: string | null;
}

export interface OrphanPuzzle {
  id: string;
  title: string;
  available_from?: string | null;
  available_until?: string | null;
}

export interface OrphanQuestion {
  id: string;
  title: string;
  available_from?: string | null;
  available_until?: string | null;
}

export interface OrphanSurvey {
  id: string;
  title: string;
  available_from?: string | null;
  available_until?: string | null;
}

export interface TracksWithOrphans {
  tracks: Track[];
  orphan_lectures: OrphanLecture[];
  orphan_tasks: OrphanTask[];
  orphan_puzzles: OrphanPuzzle[];
  orphan_questions: OrphanQuestion[];
  orphan_surveys: OrphanSurvey[];
  orphan_overdue_lectures: OrphanLecture[];
  orphan_overdue_tasks: OrphanTask[];
  orphan_overdue_puzzles: OrphanPuzzle[];
  orphan_overdue_questions: OrphanQuestion[];
  orphan_overdue_surveys: OrphanSurvey[];
}

export async function fetchTracks(): Promise<TracksWithOrphans> {
  if (hasApi()) {
    try {
      const res = await apiFetch("/api/tracks/");
      if (!res.ok) return fetchTracksStub();
      const data = await res.json();
      const tracks = Array.isArray(data.tracks)
        ? data.tracks.map((t: Record<string, unknown>) => mapTrackFromApi(t))
        : [];
      const orphan_lectures = Array.isArray(data.orphan_lectures)
        ? data.orphan_lectures.map((l: { id: string; title: string; available_from?: string | null; available_until?: string | null }) => ({
            id: String(l.id),
            title: String(l.title),
            available_from: l.available_from ?? null,
            available_until: l.available_until ?? null,
          }))
        : [];
      const orphan_tasks = Array.isArray(data.orphan_tasks)
        ? data.orphan_tasks.map((t: { id: string; title: string; hard?: boolean; available_from?: string | null; available_until?: string | null }) => ({
            id: String(t.id),
            title: String(t.title),
            hard: Boolean(t.hard),
            available_from: t.available_from ?? null,
            available_until: t.available_until ?? null,
          }))
        : [];
      const orphan_puzzles = Array.isArray(data.orphan_puzzles)
        ? data.orphan_puzzles.map((p: { id: string; title: string; available_from?: string | null; available_until?: string | null }) => ({
            id: String(p.id),
            title: String(p.title),
            available_from: p.available_from ?? null,
            available_until: p.available_until ?? null,
          }))
        : [];
      const orphan_questions = Array.isArray(data.orphan_questions)
        ? data.orphan_questions.map((q: { id: string; title: string; available_from?: string | null; available_until?: string | null }) => ({
            id: String(q.id),
            title: String(q.title),
            available_from: q.available_from ?? null,
            available_until: q.available_until ?? null,
          }))
        : [];
      const orphan_surveys = Array.isArray(data.orphan_surveys)
        ? data.orphan_surveys.map((s: { id: string; title: string; available_from?: string | null; available_until?: string | null }) => ({
            id: String(s.id),
            title: String(s.title),
            available_from: s.available_from ?? null,
            available_until: s.available_until ?? null,
          }))
        : [];
      const odl = Array.isArray(data.orphan_overdue_lectures) ? data.orphan_overdue_lectures.map((l: { id: string; title: string; available_from?: string | null; available_until?: string | null }) => ({
        id: String(l.id),
        title: String(l.title),
        available_from: l.available_from ?? null,
        available_until: l.available_until ?? null,
      })) : [];
      const odt = Array.isArray(data.orphan_overdue_tasks) ? data.orphan_overdue_tasks.map((t: { id: string; title: string; hard?: boolean; available_from?: string | null; available_until?: string | null }) => ({
        id: String(t.id),
        title: String(t.title),
        hard: Boolean(t.hard),
        available_from: t.available_from ?? null,
        available_until: t.available_until ?? null,
      })) : [];
      const odp = Array.isArray(data.orphan_overdue_puzzles) ? data.orphan_overdue_puzzles.map((p: { id: string; title: string; available_from?: string | null; available_until?: string | null }) => ({
        id: String(p.id),
        title: String(p.title),
        available_from: p.available_from ?? null,
        available_until: p.available_until ?? null,
      })) : [];
      const odq = Array.isArray(data.orphan_overdue_questions) ? data.orphan_overdue_questions.map((q: { id: string; title: string; available_from?: string | null; available_until?: string | null }) => ({
        id: String(q.id),
        title: String(q.title),
        available_from: q.available_from ?? null,
        available_until: q.available_until ?? null,
      })) : [];
      const ods = Array.isArray(data.orphan_overdue_surveys) ? data.orphan_overdue_surveys.map((s: { id: string; title: string; available_from?: string | null; available_until?: string | null }) => ({
        id: String(s.id),
        title: String(s.title),
        available_from: s.available_from ?? null,
        available_until: s.available_until ?? null,
      })) : [];
      return {
        tracks,
        orphan_lectures,
        orphan_tasks,
        orphan_puzzles,
        orphan_questions,
        orphan_surveys,
        orphan_overdue_lectures: odl,
        orphan_overdue_tasks: odt,
        orphan_overdue_puzzles: odp,
        orphan_overdue_questions: odq,
        orphan_overdue_surveys: ods,
      };
    } catch {
      return fetchTracksStub();
    }
  }
  return fetchTracksStub();
}

/** token — для SSR (передайте из cookies()), чтобы бэкенд вернул can_edit */
export async function fetchTrackById(id: string, token?: string | null, options?: { cache?: RequestCache }): Promise<Track | null> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/tracks/${id}/`, { token: token ?? undefined, cache: options?.cache ?? "default" });
      if (!res.ok) return fetchTrackByIdStub(id);
      const data = await res.json();
      return mapTrackFromApi(data);
    } catch {
      return fetchTrackByIdStub(id);
    }
  }
  const t = await fetchTrackByIdStub(id);
  return t ? { ...t, progress: {} } : null;
}

export async function createTrack(data: Omit<Track, "id">): Promise<Track> {
  if (hasApi()) {
    try {
      const res = await apiFetch("/api/tracks/", {
        method: "POST",
        body: {
          title: data.title,
          description: data.description,
          lessons: data.lessons,
          order: data.order,
          visible_group_ids: data.visibleGroupIds ?? [],
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка создания трека");
      }
      const created = await res.json();
      return mapTrackFromApi(created);
    } catch (e) {
      throw e;
    }
  }
  return createTrackStub(data);
}

export async function deleteTrack(id: string): Promise<void> {
  if (!hasApi()) throw new Error("API not configured");
  const res = await apiFetch(`/api/tracks/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка удаления трека");
  }
}

export async function updateTrack(
  id: string,
  data: { title?: string; description?: string; lessons?: Track["lessons"]; order?: number; visibleGroupIds?: string[] }
): Promise<Track> {
  if (hasApi()) {
    const res = await apiFetch(`/api/tracks/${id}/`, {
      method: "PATCH",
      body: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.lessons !== undefined && { lessons: data.lessons }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.visibleGroupIds !== undefined && { visible_group_ids: data.visibleGroupIds }),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка обновления трека");
    }
    const updated = await res.json();
    return mapTrackFromApi(updated);
  }
  throw new Error("API not configured");
}

export async function fetchTracksStub(): Promise<TracksWithOrphans> {
  await new Promise((r) => setTimeout(r, 300));
  return {
    tracks: [],
    orphan_lectures: [],
    orphan_tasks: [],
    orphan_puzzles: [],
    orphan_questions: [],
    orphan_surveys: [],
    orphan_overdue_lectures: [],
    orphan_overdue_tasks: [],
    orphan_overdue_puzzles: [],
    orphan_overdue_questions: [],
    orphan_overdue_surveys: [],
  };
}

export async function fetchTrackByIdStub(id: string): Promise<Track | null> {
  await new Promise((r) => setTimeout(r, 200));
  return null;
}

export async function createTrackStub(
  data: Omit<Track, "id">
): Promise<Track> {
  await new Promise((r) => setTimeout(r, 400));
  return {
    ...data,
    id: String(Date.now()),
  };
}

export interface TrackProgressResult {
  progress: TrackProgress;
  progressLate?: Record<string, number>;
}

export async function fetchTrackProgressStub(_trackId: string): Promise<TrackProgressResult> {
  await new Promise((r) => setTimeout(r, 150));
  return { progress: {} };
}

/**
 * Загружает трек с прогрессом (для авторизованного пользователя).
 */
export async function fetchTrackByIdWithProgress(trackId: string): Promise<Track | null> {
  return fetchTrackById(trackId);
}

/** Загружает прогресс и просрочку по треку. */
export async function fetchTrackProgress(trackId: string): Promise<TrackProgressResult> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/tracks/${trackId}/`);
      if (!res.ok) return { progress: {} };
      const data = await res.json();
      const progress = (data.progress && typeof data.progress === "object" ? data.progress : {}) as TrackProgress;
      const progressLate = (data.progress_late && typeof data.progress_late === "object" ? data.progress_late : {}) as Record<string, number>;
      return { progress, progressLate };
    } catch {
      return fetchTrackProgressStub(trackId);
    }
  }
  return fetchTrackProgressStub(trackId);
}

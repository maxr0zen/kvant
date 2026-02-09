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
    visibleGroupIds: Array.isArray(data.visible_group_ids) ? (data.visible_group_ids as string[]) : undefined,
  };
}

export interface OrphanLecture {
  id: string;
  title: string;
}

export interface OrphanTask {
  id: string;
  title: string;
  hard?: boolean;
}

export interface TracksWithOrphans {
  tracks: Track[];
  orphan_lectures: OrphanLecture[];
  orphan_tasks: OrphanTask[];
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
        ? data.orphan_lectures.map((l: { id: string; title: string }) => ({ id: String(l.id), title: String(l.title) }))
        : [];
      const orphan_tasks = Array.isArray(data.orphan_tasks)
        ? data.orphan_tasks.map((t: { id: string; title: string; hard?: boolean }) => ({
            id: String(t.id),
            title: String(t.title),
            hard: Boolean(t.hard),
          }))
        : [];
      return { tracks, orphan_lectures, orphan_tasks };
    } catch {
      return fetchTracksStub();
    }
  }
  return fetchTracksStub();
}

export async function fetchTrackById(id: string): Promise<Track | null> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/tracks/${id}/`);
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

export async function fetchTracksStub(): Promise<TracksWithOrphans> {
  await new Promise((r) => setTimeout(r, 300));
  return { tracks: [], orphan_lectures: [], orphan_tasks: [] };
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

export async function fetchTrackProgressStub(_trackId: string): Promise<TrackProgress> {
  await new Promise((r) => setTimeout(r, 150));
  return {};
}

/**
 * Загружает трек с прогрессом (для авторизованного пользователя).
 */
export async function fetchTrackByIdWithProgress(trackId: string): Promise<Track | null> {
  return fetchTrackById(trackId);
}

/** Загружает только прогресс по треку. */
export async function fetchTrackProgress(trackId: string): Promise<TrackProgress> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/tracks/${trackId}/`);
      if (!res.ok) return {};
      const data = await res.json();
      return (data.progress && typeof data.progress === "object" ? data.progress : {}) as TrackProgress;
    } catch {
      return fetchTrackProgressStub(trackId);
    }
  }
  return fetchTrackProgressStub(trackId);
}

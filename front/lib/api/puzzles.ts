/**
 * Puzzles API. With NEXT_PUBLIC_API_URL uses backend; otherwise stubs.
 */

import type { Puzzle, PuzzleBlock, PuzzleCheckResult } from "@/lib/types";
import { getStoredToken } from "@/lib/api/auth";
import { apiFetch, hasApi } from "@/lib/api/client";

// Mock data removed - use backend API only

function mapPuzzleFromApi(data: Record<string, unknown>): Puzzle {
  const blocks = Array.isArray(data.blocks)
    ? (data.blocks as Record<string, unknown>[]).map((block) => ({
        id: String(block.id),
        code: String(block.code),
        order: String(block.order),
        indent: String(block.indent ?? ""),
      }))
    : [];

  return {
    id: String(data.id),
    title: String(data.title),
    description: String(data.description ?? ""),
    language: String(data.language ?? "python"),
    trackId: data.track_id != null ? String(data.track_id) : undefined,
    blocks,
    solution: String(data.solution ?? ""),
    visibleGroupIds: Array.isArray(data.visible_group_ids) ? (data.visible_group_ids as string[]) : undefined,
    hints: Array.isArray(data.hints) ? (data.hints as string[]) : undefined,
    availableFrom: data.available_from != null ? String(data.available_from) : undefined,
    availableUntil: data.available_until != null ? String(data.available_until) : undefined,
    maxAttempts: data.max_attempts != null ? Number(data.max_attempts) : undefined,
    attemptsUsed: data.attempts_used != null ? Number(data.attempts_used) : undefined,
    canEdit: Boolean(data.can_edit),
  };
}

export async function fetchAllPuzzles(): Promise<Puzzle[]> {
  if (hasApi() && typeof window !== "undefined" && getStoredToken()) {
    try {
      const res = await apiFetch("/api/puzzles/");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data.map((p: Record<string, unknown>) => mapPuzzleFromApi(p)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function fetchPuzzleById(id: string, token?: string | null): Promise<Puzzle | null> {
  const authToken = token ?? (typeof window !== "undefined" ? getStoredToken() : null);
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/puzzles/${id}/`, { token: authToken });
      if (!res.ok) return fetchPuzzleByIdStub(id);
      const data = await res.json();
      return mapPuzzleFromApi(data);
    } catch {
      return fetchPuzzleByIdStub(id);
    }
  }
  return fetchPuzzleByIdStub(id);
}

export async function createPuzzle(data: Omit<Puzzle, "id">): Promise<Puzzle> {
  if (hasApi()) {
    try {
      const res = await apiFetch("/api/puzzles/create/", {
        method: "POST",
        body: {
          title: data.title,
          description: data.description ?? "",
          language: data.language ?? "python",
          track_id: data.trackId ?? null,
          blocks: data.blocks.map((block) => ({
            id: block.id,
            code: block.code,
            order: block.order,
            indent: block.indent,
          })),
          solution: data.solution ?? "",
          visible_group_ids: data.visibleGroupIds ?? [],
          hints: data.hints ?? [],
          available_from: data.availableFrom ?? null,
          available_until: data.availableUntil ?? null,
          max_attempts: data.maxAttempts ?? null,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка создания puzzle");
      }
      const created = await res.json();
      return mapPuzzleFromApi(created);
    } catch (e) {
      throw e;
    }
  }
  return createPuzzleStub(data);
}

export type PuzzleUpdatePayload = Partial<Pick<Puzzle, "title" | "description" | "language" | "trackId" | "blocks" | "solution" | "visibleGroupIds" | "hints" | "availableFrom" | "availableUntil" | "maxAttempts">>;

export async function updatePuzzle(id: string, data: PuzzleUpdatePayload): Promise<Puzzle> {
  if (!hasApi()) throw new Error("API not configured");
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.language !== undefined) body.language = data.language;
  if (data.trackId !== undefined) body.track_id = data.trackId;
  if (data.blocks !== undefined) body.blocks = data.blocks.map((b) => ({ id: b.id, code: b.code, order: b.order, indent: b.indent }));
  if (data.solution !== undefined) body.solution = data.solution;
  if (data.visibleGroupIds !== undefined) body.visible_group_ids = data.visibleGroupIds;
  if (data.hints !== undefined) body.hints = data.hints;
  if (data.availableFrom !== undefined) body.available_from = data.availableFrom;
  if (data.availableUntil !== undefined) body.available_until = data.availableUntil;
  if (data.maxAttempts !== undefined) body.max_attempts = data.maxAttempts;
  const res = await apiFetch(`/api/puzzles/${id}/`, {
    method: "PATCH",
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка обновления puzzle");
  }
  const updated = await res.json();
  return mapPuzzleFromApi(updated);
}

export async function deletePuzzle(id: string): Promise<void> {
  if (!hasApi()) throw new Error("API not configured");
  const res = await apiFetch(`/api/puzzles/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка удаления puzzle");
  }
}

export async function checkPuzzleSolution(
  puzzleId: string,
  blocks: PuzzleBlock[]
): Promise<PuzzleCheckResult> {
  if (hasApi()) {
    try {
      const res = await apiFetch(`/api/puzzles/${puzzleId}/check/`, {
        method: "POST",
        body: { blocks },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.detail === "string" ? err.detail : "Ошибка проверки решения");
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
  return checkPuzzleSolutionStub(puzzleId, blocks);
}

export async function fetchPuzzleByIdStub(id: string): Promise<Puzzle | null> {
  // Backend API required - no fallback data available
  return null;
}

export async function createPuzzleStub(data: Omit<Puzzle, "id">): Promise<Puzzle> {
  // Backend API required - no fallback data available
  throw new Error("Backend API required");
}

export async function checkPuzzleSolutionStub(
  puzzleId: string,
  blocks: PuzzleBlock[]
): Promise<PuzzleCheckResult> {
  // Backend API required - no fallback data available
  return { passed: false, message: "Backend API required" };
}

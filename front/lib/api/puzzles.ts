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

export async function fetchPuzzleById(id: string): Promise<Puzzle | null> {
  if (hasApi() && typeof window !== "undefined" && getStoredToken()) {
    try {
      const res = await apiFetch(`/api/puzzles/${id}/`);
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

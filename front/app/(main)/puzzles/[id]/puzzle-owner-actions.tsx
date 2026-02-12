"use client";

import { OwnerActions } from "@/components/owner-actions";
import { deletePuzzle } from "@/lib/api/puzzles";

export function PuzzleOwnerActions({ puzzleId, canEdit }: { puzzleId: string; canEdit: boolean }) {
  return (
    <OwnerActions
      canEdit={canEdit}
      editHref={`/puzzles/${puzzleId}/edit`}
      onDelete={() => deletePuzzle(puzzleId)}
      afterDeleteRedirect="/main"
    />
  );
}

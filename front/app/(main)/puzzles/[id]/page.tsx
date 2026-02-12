import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchPuzzleById } from "@/lib/api/puzzles";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { PuzzleView } from "./puzzle-view";
import { Button } from "@/components/ui/button";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { PuzzleOwnerActions } from "./puzzle-owner-actions";

export default async function PuzzlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
  const puzzle = await fetchPuzzleById(id, token);
  if (!puzzle) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/main">
          <Button variant="ghost" size="sm">
            К трекам
          </Button>
        </Link>
        {puzzle.canEdit && <PuzzleOwnerActions puzzleId={id} canEdit={puzzle.canEdit} />}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0" />
        <AvailabilityCountdown availableUntil={puzzle.availableUntil} className="shrink-0" />
      </div>
      <PuzzleView puzzle={puzzle} />
      <div className="pt-4">
        <Link href="/main">
          <Button variant="outline">К списку треков</Button>
        </Link>
      </div>
    </div>
  );
}

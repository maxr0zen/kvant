import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchPuzzleById } from "@/lib/api/puzzles";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { PuzzleView } from "./puzzle-view";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title={puzzle.title || "Puzzle"}
        breadcrumbs={[{ label: "Треки", href: "/main" }, { label: "Puzzle" }]}
        actions={
          <div className="flex items-center gap-2">
            <AvailabilityCountdown availableUntil={puzzle.availableUntil} className="shrink-0" />
            {puzzle.canEdit && <PuzzleOwnerActions puzzleId={id} canEdit={puzzle.canEdit} />}
          </div>
        }
      />
      <PuzzleView puzzle={puzzle} />
    </div>
  );
}

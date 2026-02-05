import { fetchPuzzleById } from "@/lib/api/puzzles";
import { PuzzleView } from "./puzzle-view";
import { notFound } from "next/navigation";

interface PuzzlePageProps {
  params: { id: string };
}

export default async function PuzzlePage({ params }: PuzzlePageProps) {
  const puzzle = await fetchPuzzleById(params.id);

  if (!puzzle) {
    notFound();
  }

  return <PuzzleView puzzle={puzzle} />;
}

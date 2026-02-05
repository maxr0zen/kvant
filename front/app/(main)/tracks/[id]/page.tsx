import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchTrackById } from "@/lib/api/tracks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrackLessonList } from "@/components/track-lesson-list";

export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const track = await fetchTrackById(id);
  if (!track) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{track.title}</h1>
        <p className="text-muted-foreground mt-1">{track.description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Уроки</CardTitle>
        </CardHeader>
        <CardContent>
          <TrackLessonList track={track} trackId={id} />
        </CardContent>
      </Card>
      <div className="pt-2">
        <Link href="/tracks">
          <Button variant="ghost">Назад к трекам</Button>
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchTrackById } from "@/lib/api/tracks";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrackLessonList } from "@/components/track-lesson-list";
import { TrackEditLessons } from "@/components/track-edit-lessons";
import { TrackOwnerActions } from "./track-owner-actions";

export default async function MainTrackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
  const track = await fetchTrackById(id, token);
  if (!track) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{track.title}</h1>
          <p className="text-muted-foreground mt-1">{track.description}</p>
        </div>
        <TrackOwnerActions trackId={id} canEdit={track.canEdit ?? false} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Уроки</CardTitle>
        </CardHeader>
        <CardContent>
          <TrackLessonList track={track} trackId={id} />
          <TrackEditLessons track={track} trackId={id} />
        </CardContent>
      </Card>
      <div className="pt-2">
        <Link href="/main">
          <Button variant="ghost">Назад к трекам</Button>
        </Link>
      </div>
    </div>
  );
}

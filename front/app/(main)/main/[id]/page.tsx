import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchTrackById } from "@/lib/api/tracks";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackLessonList } from "@/components/track-lesson-list";
import { TrackEditLessons } from "@/components/track-edit-lessons";
import { TrackOwnerActions } from "./track-owner-actions";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        title={track.title}
        description={track.description}
        breadcrumbs={[{ label: "Треки", href: "/main" }, { label: track.title }]}
        actions={<TrackOwnerActions trackId={id} canEdit={track.canEdit ?? false} />}
      />
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Уроки</CardTitle>
        </CardHeader>
        <CardContent>
          <TrackLessonList track={track} trackId={id} />
          <TrackEditLessons track={track} trackId={id} />
        </CardContent>
      </Card>
    </div>
  );
}

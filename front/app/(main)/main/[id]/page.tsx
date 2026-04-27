import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { BookOpen, Eye, Layers3, Sparkles } from "lucide-react";
import { fetchTrackById } from "@/lib/api/tracks";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackLessonList } from "@/components/track-lesson-list";
import { TrackEditLessons } from "@/components/track-edit-lessons";
import { TrackVisibilityEditor } from "@/components/track-visibility-editor";
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
      <section className="hero-surface p-6 sm:p-7 lg:p-8">
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <span className="kavnt-badge">Track detail</span>
            <PageHeader
              title={track.title}
              description={track.description}
              breadcrumbs={[{ label: "Треки", href: "/main" }, { label: track.title }]}
              actions={<TrackOwnerActions trackId={id} canEdit={track.canEdit ?? false} />}
              compact
              className="mb-0"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Уроков</p>
                  <p className="text-2xl font-semibold tracking-[-0.03em]">{track.lessons.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Видимость</p>
                  <p className="text-sm font-semibold">{(track.visibleGroupIds ?? []).length ? "По группам" : "Открыт всем"}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Архитектура</p>
                  <p className="text-sm font-semibold">Theme-ready flow</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card className="overflow-visible">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Учебный маршрут
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <TrackVisibilityEditor
            trackId={id}
            initialVisibleGroupIds={track.visibleGroupIds ?? []}
            canEdit={track.canEdit ?? false}
          />
          <TrackLessonList track={track} trackId={id} />
          <TrackEditLessons track={track} trackId={id} />
        </CardContent>
      </Card>
    </div>
  );
}

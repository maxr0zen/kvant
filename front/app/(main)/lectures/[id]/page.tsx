import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { FileText, Layers3, Sparkles } from "lucide-react";
import { fetchLectureById } from "@/lib/api/lectures";
import { fetchLayoutById } from "@/lib/api/layouts";
import { fetchTrackById } from "@/lib/api/tracks";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { LectureBlocks } from "@/app/(main)/lectures/[id]/lecture-blocks";
import { LegacyLectureContent } from "@/app/(main)/lectures/[id]/legacy-lecture-content";
import { LectureViewTracker } from "@/components/lecture-view-tracker";
import { LectureHeader } from "@/components/lecture-header";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function LecturePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ layoutId?: string }>;
}) {
  const { id } = await params;
  const { layoutId } = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
  let lecture = await fetchLectureById(id, token, { cache: "no-store" });
  let resolvedLectureId = id;

  if (!lecture && layoutId) {
    const layoutFromQuery = await fetchLayoutById(layoutId, token);
    if (layoutFromQuery?.attachedLecture) {
      lecture = layoutFromQuery.attachedLecture;
      resolvedLectureId = layoutFromQuery.attachedLecture.id;
    } else if (layoutFromQuery?.attachedLectureId) {
      const linkedLecture = await fetchLectureById(layoutFromQuery.attachedLectureId, token, { cache: "no-store" });
      if (linkedLecture) {
        lecture = linkedLecture;
        resolvedLectureId = linkedLecture.id;
      }
    }
  }

  if (!lecture) {
    const layout = await fetchLayoutById(id, token);
    if (layout?.attachedLecture) {
      lecture = layout.attachedLecture;
      resolvedLectureId = layout.attachedLecture.id;
    } else if (layout?.attachedLectureId) {
      const linkedLecture = await fetchLectureById(layout.attachedLectureId, token, { cache: "no-store" });
      if (linkedLecture) {
        lecture = linkedLecture;
        resolvedLectureId = linkedLecture.id;
      }
    }
  }

  if (!lecture) notFound();

  if (lecture.trackId) {
    const track = await fetchTrackById(lecture.trackId, token, { cache: "no-store" });
    const inTrack = Boolean(track?.lessons?.some((lesson) => String(lesson.id) === String(resolvedLectureId) || String(lesson.id) === String(id)));
    if (inTrack) {
      redirect(`/main/${lecture.trackId}/lesson/${resolvedLectureId}`);
    }
  }

  const hasBlocks = lecture.blocks && lecture.blocks.length > 0;

  return (
    <div className="space-y-6">
      <LectureViewTracker lectureId={resolvedLectureId} />

      <section className="hero-surface p-6 sm:p-7 lg:p-8">
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <span className="kavnt-badge">Lecture view</span>
            <PageHeader
              title={lecture.title}
              breadcrumbs={[{ label: "Треки", href: "/main" }, { label: lecture.title }]}
              actions={
                lecture.canEdit ? <LectureHeader lectureId={resolvedLectureId} title={lecture.title} canEdit={lecture.canEdit} /> : undefined
              }
              compact
              className="mb-0"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Focused reading surface</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Материал читается как спокойная editorial-страница, без лишних отвлечений.</p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Block-based lecture model</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Текст, изображения, код и интерактивные блоки остаются собранными в понятную структуру.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-white/55 bg-background/84 p-5 shadow-[var(--shadow-medium)] backdrop-blur-xl dark:border-white/10 sm:p-6 lg:p-8">
        {hasBlocks ? (
          <LectureBlocks blocks={lecture.blocks!} lectureId={resolvedLectureId} />
        ) : lecture.content ? (
          <div className="rounded-[1.5rem] border border-border/70 bg-secondary/35 px-6 py-6 prose prose-sm max-w-none dark:prose-invert">
            <LegacyLectureContent content={lecture.content} />
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Содержимое пока пусто"
            description="В этой лекции еще нет материалов. Когда контент будет добавлен, он появится здесь."
          />
        )}
      </section>
    </div>
  );
}

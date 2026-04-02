import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
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
import { FileText } from "lucide-react";

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

  // Fallback #1: если передан layoutId, берем лекцию из задания верстки.
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

  // Fallback #2: если пользователь перешел по id задания верстки в path-параметре.
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

  // Если лекция реально присутствует в уроках трека — переходим на страницу урока.
  // Для "служебных" лекций (не добавленных в lessons) остаемся на /lectures/[id].
  if (lecture.trackId) {
    const track = await fetchTrackById(lecture.trackId, token, { cache: "no-store" });
    const inTrack = Boolean(
      track?.lessons?.some((l) => String(l.id) === String(resolvedLectureId) || String(l.id) === String(id))
    );
    if (inTrack) {
      redirect(`/main/${lecture.trackId}/lesson/${resolvedLectureId}`);
    }
  }

  const hasBlocks = lecture.blocks && lecture.blocks.length > 0;

  return (
    <div className="w-full min-w-0 space-y-6">
      <LectureViewTracker lectureId={resolvedLectureId} />
      <PageHeader
        title={lecture.title}
        breadcrumbs={[
          { label: "Треки", href: "/main" },
          { label: lecture.title },
        ]}
        actions={
          lecture.canEdit ? (
            <LectureHeader lectureId={resolvedLectureId} title={lecture.title} canEdit={lecture.canEdit} />
          ) : undefined
        }
      />
      <div className="min-w-0">
        {hasBlocks ? (
          <LectureBlocks blocks={lecture.blocks!} lectureId={resolvedLectureId} />
        ) : lecture.content ? (
          <div className="rounded-xl border bg-muted/20 px-6 py-5 prose prose-sm dark:prose-invert max-w-none">
            <LegacyLectureContent content={lecture.content} />
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="Содержимое пусто"
            description="В этой лекции пока нет материалов."
          />
        )}
      </div>
    </div>
  );
}

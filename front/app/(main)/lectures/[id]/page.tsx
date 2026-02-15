import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchLectureById } from "@/lib/api/lectures";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
  const lecture = await fetchLectureById(id, token);
  if (!lecture) notFound();

  // Если лекция в треке — переходим на страницу урока в треке
  if (lecture.trackId) {
    redirect(`/main/${lecture.trackId}/lesson/${id}`);
  }

  const hasBlocks = lecture.blocks && lecture.blocks.length > 0;

  return (
    <div className="w-full min-w-0 space-y-6">
      <LectureViewTracker lectureId={id} />
      <PageHeader
        title={lecture.title}
        breadcrumbs={[
          { label: "Треки", href: "/main" },
          { label: lecture.title },
        ]}
        actions={
          lecture.canEdit ? (
            <LectureHeader lectureId={id} title={lecture.title} canEdit={lecture.canEdit} />
          ) : undefined
        }
      />
      <div className="min-w-0">
        {hasBlocks ? (
          <LectureBlocks blocks={lecture.blocks!} lectureId={id} />
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

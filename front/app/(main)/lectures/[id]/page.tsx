import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { fetchLectureById } from "@/lib/api/lectures";
import { LectureBlocks } from "@/app/(main)/lectures/[id]/lecture-blocks";
import { LegacyLectureContent } from "@/app/(main)/lectures/[id]/legacy-lecture-content";
import { LectureViewTracker } from "@/components/lecture-view-tracker";
import { LectureHeader } from "@/components/lecture-header";
import { Button } from "@/components/ui/button";

export default async function LecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lecture = await fetchLectureById(id);
  if (!lecture) notFound();

  // Если лекция в треке — переходим на страницу урока в треке
  if (lecture.trackId) {
    redirect(`/tracks/${lecture.trackId}/lesson/${id}`);
  }

  const hasBlocks = lecture.blocks && lecture.blocks.length > 0;

  return (
    <div className="w-full min-w-0 space-y-6">
      <LectureViewTracker lectureId={id} />
      <div className="flex items-center justify-between gap-4">
        <LectureHeader lectureId={id} title={lecture.title} />
        <Link href="/tracks">
          <Button variant="outline" size="sm">
            К трекам
          </Button>
        </Link>
      </div>
      <div className="min-w-0">
        {hasBlocks ? (
          <LectureBlocks blocks={lecture.blocks!} lectureId={id} />
        ) : lecture.content ? (
          <div className="rounded-xl border border-border/60 bg-muted/20 px-6 py-5 prose prose-sm dark:prose-invert max-w-none">
            <LegacyLectureContent content={lecture.content} />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 py-8 text-center text-muted-foreground">
            Содержимое лекции пусто.
          </p>
        )}
      </div>
      <div className="pt-4">
        <Link href="/tracks">
          <Button variant="outline">К списку треков</Button>
        </Link>
      </div>
    </div>
  );
}

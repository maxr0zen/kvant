import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchTrackById } from "@/lib/api/tracks";
import { fetchLectureById } from "@/lib/api/lectures";
import { fetchTaskById } from "@/lib/api/tasks";
import { fetchPuzzleById } from "@/lib/api/puzzles";
import { Button } from "@/components/ui/button";
import { TrackLessonNav } from "@/components/track-lesson-nav";
import { LectureHeader } from "@/components/lecture-header";
import { getPrevNextLesson } from "@/lib/utils/track-nav";
import { LectureBlocks } from "@/app/(main)/lectures/[id]/lecture-blocks";
import { LegacyLectureContent } from "@/app/(main)/lectures/[id]/legacy-lecture-content";
import { TaskView } from "@/app/(main)/tasks/[id]/task-view";
import { PuzzleView } from "@/app/(main)/puzzles/[id]/puzzle-view";
import { QuestionView } from "@/app/(main)/questions/[id]/question-view";
import { LectureViewTracker } from "@/components/lecture-view-tracker";

export default async function TrackLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: trackId, lessonId } = await params;
  const track = await fetchTrackById(trackId);
  if (!track) notFound();

  const lesson =
    track.lessons.find((l) => l.id === lessonId) ??
    track.lessons.find((l) => String(l.id).toLowerCase() === lessonId.toLowerCase());
  if (!lesson) notFound();

  const { prev, next } = getPrevNextLesson(track, lessonId);

  if (lesson.type === "lecture") {
    const lecture = await fetchLectureById(lessonId);
    if (!lecture) notFound();
    const hasBlocks = lecture.blocks && lecture.blocks.length > 0;

    return (
      <div className="w-full min-w-0 space-y-6">
        <LectureViewTracker lectureId={lessonId} />
        <TrackLessonNav
          trackId={trackId}
          trackTitle={track.title}
          prev={prev}
          next={next}
          className="rounded-lg border bg-muted/30 px-4 py-4"
        />
        <div className="flex items-center justify-between gap-4">
          <LectureHeader lectureId={lessonId} title={lecture.title} />
          <Link href={`/tracks/${trackId}`}>
            <Button variant="outline" size="sm">
              К треку
            </Button>
          </Link>
        </div>
        <div className="min-w-0">
          {hasBlocks ? (
            <LectureBlocks blocks={lecture.blocks!} lectureId={lessonId} />
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
        <div className="flex flex-col gap-4 pt-2">
          <TrackLessonNav
            trackId={trackId}
            trackTitle={track.title}
            prev={prev}
            next={next}
            className="rounded-lg border bg-muted/30 px-4 py-4"
          />
          <div className="pt-2">
            <Link href={`/tracks/${trackId}`}>
              <Button variant="outline">К списку уроков</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (lesson.type === "puzzle") {
    const puzzle = await fetchPuzzleById(lessonId);
    if (!puzzle) notFound();

    return (
      <div className="w-full min-w-0 space-y-6">
        <TrackLessonNav
          trackId={trackId}
          trackTitle={track.title}
          prev={prev}
          next={next}
          className="rounded-lg border bg-muted/30 px-4 py-4"
        />
        <PuzzleView puzzle={puzzle} />
        <TrackLessonNav
          trackId={trackId}
          trackTitle={track.title}
          prev={prev}
          next={next}
          className="rounded-lg border bg-muted/30 px-4 py-4"
        />
        <div className="pt-4">
          <Link href={`/tracks/${trackId}`}>
            <Button variant="outline">К списку уроков</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (lesson.type === "question") {
    const question = await import('@/lib/api/questions').then(m => m.fetchQuestionById(lessonId));
    if (!question) notFound();
    return (
      <div className="w-full min-w-0 space-y-6">
        <TrackLessonNav
          trackId={trackId}
          trackTitle={track.title}
          prev={prev}
          next={next}
          className="rounded-lg border bg-muted/30 px-4 py-4"
        />
        <QuestionView question={question} />
        <TrackLessonNav
          trackId={trackId}
          trackTitle={track.title}
          prev={prev}
          next={next}
          className="rounded-lg border bg-muted/30 px-4 py-4"
        />
        <div className="pt-4">
          <Link href={`/tracks/${trackId}`}>
            <Button variant="outline">К списку уроков</Button>
          </Link>
        </div>
      </div>
    );
  }

  const task = await fetchTaskById(lessonId);
  if (!task) notFound();

  return (
    <div className="w-full min-w-0 space-y-6">
      <TrackLessonNav
        trackId={trackId}
        trackTitle={track.title}
        prev={prev}
        next={next}
        className="rounded-lg border bg-muted/30 px-4 py-4"
      />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          {task.title}
          {task.hard && (
            <span className="text-amber-500" title="Повышенная сложность">★</span>
          )}
        </h1>
        <p className="text-muted-foreground mt-1">{task.description}</p>
      </div>
      <TaskView task={task} />
      <TrackLessonNav
        trackId={trackId}
        trackTitle={track.title}
        prev={prev}
        next={next}
        className="rounded-lg border bg-muted/30 px-4 py-4"
      />
      <div className="pt-4">
        <Link href={`/tracks/${trackId}`}>
          <Button variant="outline">К списку уроков</Button>
        </Link>
      </div>
    </div>
  );
}

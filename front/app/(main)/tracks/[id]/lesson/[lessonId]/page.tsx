import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchTrackById } from "@/lib/api/tracks";
import { fetchLectureById } from "@/lib/api/lectures";
import { fetchTaskById } from "@/lib/api/tasks";
import { fetchPuzzleById } from "@/lib/api/puzzles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackLessonNav } from "@/components/track-lesson-nav";
import { getPrevNextLesson } from "@/lib/utils/track-nav";
import { LectureBlocks } from "@/app/(main)/lectures/[id]/lecture-blocks";
import { LegacyLectureContent } from "@/app/(main)/lectures/[id]/legacy-lecture-content";
import { TaskView } from "@/app/(main)/tasks/[id]/task-view";
import { PuzzleView } from "@/app/(main)/puzzles/[id]/puzzle-view";
import { QuestionView } from "@/app/(main)/questions/[id]/question-view";

export default async function TrackLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: trackId, lessonId } = await params;
  const track = await fetchTrackById(trackId);
  if (!track) notFound();

  const lesson = track.lessons.find((l) => l.id === lessonId);
  if (!lesson) notFound();

  const { prev, next } = getPrevNextLesson(track, lessonId);

  if (lesson.type === "lecture") {
    const lecture = await fetchLectureById(lessonId);
    if (!lecture) notFound();
    const hasBlocks = lecture.blocks && lecture.blocks.length > 0;

    return (
      <div className="space-y-6 max-w-3xl">
        <TrackLessonNav
          trackId={trackId}
          trackTitle={track.title}
          prev={prev}
          next={next}
          className="rounded-lg border bg-muted/30 px-4 py-4"
        />
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            {lecture.title}
          </h1>
          <Link href={`/tracks/${trackId}`}>
            <Button variant="outline" size="sm">
              К треку
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="sr-only">Содержание</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            {hasBlocks ? (
              <LectureBlocks blocks={lecture.blocks!} />
            ) : lecture.content ? (
              <LegacyLectureContent content={lecture.content} />
            ) : (
              <p className="text-muted-foreground">Содержимое лекции пусто.</p>
            )}
          </CardContent>
        </Card>
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
      <div className="space-y-6">
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
      <div className="space-y-6">
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
    <div className="space-y-6">
      <TrackLessonNav
        trackId={trackId}
        trackTitle={track.title}
        prev={prev}
        next={next}
        className="rounded-lg border bg-muted/30 px-4 py-4"
      />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{task.title}</h1>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { fetchTrackById } from "@/lib/api/tracks";
import { fetchLectureById } from "@/lib/api/lectures";
import { fetchTaskById } from "@/lib/api/tasks";
import { fetchPuzzleById } from "@/lib/api/puzzles";
import { Button } from "@/components/ui/button";
import { TrackLessonNav } from "@/components/track-lesson-nav";
import { LectureHeader } from "@/components/lecture-header";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { getPrevNextLesson } from "@/lib/utils/track-nav";
import { LectureBlocks } from "@/app/(main)/lectures/[id]/lecture-blocks";
import { LegacyLectureContent } from "@/app/(main)/lectures/[id]/legacy-lecture-content";
import { TaskView } from "@/app/(main)/tasks/[id]/task-view";
import { PuzzleView } from "@/app/(main)/puzzles/[id]/puzzle-view";
import { QuestionView } from "@/app/(main)/questions/[id]/question-view";
import { SurveyView } from "@/app/(main)/surveys/[id]/survey-view";
import { fetchSurveyById } from "@/lib/api/surveys";
import { LectureViewTracker } from "@/components/lecture-view-tracker";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";

export default async function MainTrackLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: trackId, lessonId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
  const track = await fetchTrackById(trackId, token, { cache: "no-store" });
  if (!track) notFound();

  let lesson =
    track.lessons.find((l) => l.id === lessonId) ??
    track.lessons.find((l) => String(l.id).toLowerCase() === lessonId.toLowerCase());

  // Fallback: если урок не найден в треке, но это лекция — попробовать загрузить по lessonId
  // (случай, когда лекция создана, но track.lessons не обновился)
  if (!lesson) {
    const lectureFallback = await fetchLectureById(lessonId, token, { cache: "no-store" });
    if (lectureFallback && lectureFallback.trackId === trackId) {
      lesson = { id: lessonId, type: "lecture" as const, title: lectureFallback.title, order: 0 };
    }
  }
  if (!lesson) notFound();

  const { prev, next } = getPrevNextLesson(track, lessonId);

  if (lesson.type === "lecture") {
    const lecture = await fetchLectureById(lessonId, token, { cache: "no-store" });
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
          <Link href={`/main/${trackId}`}>
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
            <p className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 py-8 text-muted-foreground">
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
            <Link href={`/main/${trackId}`}>
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
          <Link href={`/main/${trackId}`}>
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
          <Link href={`/main/${trackId}`}>
            <Button variant="outline">К списку уроков</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (lesson.type === "survey") {
    const survey = await fetchSurveyById(lessonId);
    if (!survey) notFound();
    return (
      <div className="w-full min-w-0 space-y-6">
        <TrackLessonNav
          trackId={trackId}
          trackTitle={track.title}
          prev={prev}
          next={next}
          className="rounded-lg border bg-muted/30 px-4 py-4"
        />
        <SurveyView survey={survey} />
        <TrackLessonNav
          trackId={trackId}
          trackTitle={track.title}
          prev={prev}
          next={next}
          className="rounded-lg border bg-muted/30 px-4 py-4"
        />
        <div className="pt-4">
          <Link href={`/main/${trackId}`}>
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
            {task.title}
            {task.hard && (
              <span className="text-amber-500" title="?????????? ?????????">?</span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">{task.description}</p>
        </div>
        <AvailabilityCountdown availableUntil={task.availableUntil} className="shrink-0" />
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
        <Link href={`/main/${trackId}`}>
          <Button variant="outline">К списку уроков</Button>
        </Link>
      </div>
    </div>
  );
}

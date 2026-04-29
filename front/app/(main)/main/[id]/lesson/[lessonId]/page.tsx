import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, BookOpen, Layers3, Sparkles } from "lucide-react";
import { fetchTrackById } from "@/lib/api/tracks";
import { fetchLectureById } from "@/lib/api/lectures";
import { fetchTaskById } from "@/lib/api/tasks";
import { fetchPuzzleById } from "@/lib/api/puzzles";
import { fetchSurveyById } from "@/lib/api/surveys";
import { fetchLayoutById } from "@/lib/api/layouts";
import { fetchQuestionById } from "@/lib/api/questions";
import { Button } from "@/components/ui/button";
import { TrackLessonNav } from "@/components/track-lesson-nav";
import { LectureHeader } from "@/components/lecture-header";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { getPrevNextLesson } from "@/lib/utils/track-nav";
import { LectureBlocks } from "@/app/(main)/lectures/[id]/lecture-blocks";
import type { LectureBlock } from "@/lib/types";
import { LegacyLectureContent } from "@/app/(main)/lectures/[id]/legacy-lecture-content";
import { TaskView } from "@/app/(main)/tasks/[id]/task-view";
import { PuzzleView } from "@/app/(main)/puzzles/[id]/puzzle-view";
import { QuestionView } from "@/app/(main)/questions/[id]/question-view";
import { SurveyView } from "@/app/(main)/surveys/[id]/survey-view";
import { LayoutView } from "@/app/(main)/layouts/[id]/layout-view";
import { LectureViewTracker } from "@/components/lecture-view-tracker";
import { AUTH_TOKEN_COOKIE } from "@/lib/api/auth";
import { PageHeader } from "@/components/ui/page-header";

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
    track.lessons.find((item) => item.id === lessonId) ??
    track.lessons.find((item) => String(item.id).toLowerCase() === lessonId.toLowerCase());

  if (!lesson) {
    const lectureFallback = await fetchLectureById(lessonId, token, { cache: "no-store" });
    if (lectureFallback && lectureFallback.trackId === trackId) {
      lesson = { id: lessonId, type: "lecture" as const, title: lectureFallback.title, order: 0 };
    }
  }

  if (!lesson) notFound();

  const { prev, next } = getPrevNextLesson(track, lessonId);

  const shell = (title: string, description?: string, right?: React.ReactNode, body?: React.ReactNode) => (
    <div className="space-y-6">
      <TrackLessonNav trackId={trackId} trackTitle={track.title} prev={prev} next={next} />

      <section className="hero-surface p-6 sm:p-7 lg:p-8">
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <span className="kavnt-badge">Lesson flow</span>
            <PageHeader title={title} description={description} compact className="mb-0" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {right}
            <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Calm hierarchy</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Навигация, статус и следующее действие читаются быстрее, чем сами вторичные детали.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {body}

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/main/${trackId}`}>
          <Button variant="outline" className="justify-between gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>К списку уроков</span>
          </Button>
        </Link>
      </div>

      <TrackLessonNav trackId={trackId} trackTitle={track.title} prev={prev} next={next} />
    </div>
  );

  if (lesson.type === "lecture") {
    const lecture = await fetchLectureById(lessonId, token, { cache: "no-store" });
    if (!lecture) notFound();
    const hasBlocks = lecture.blocks && lecture.blocks.length > 0;
    const isImmersive = lecture.blocks?.some((b: LectureBlock) => b.type === "web_file") ?? false;

    if (isImmersive) {
      return (
        <div className="space-y-6">
          <TrackLessonNav trackId={trackId} trackTitle={track.title} prev={prev} next={next} className="sticky top-0 z-50" />
          <LectureViewTracker lectureId={lessonId} />
          <div className="-mx-4 -my-5 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 xl:-mx-10">
            {hasBlocks ? (
              <LectureBlocks blocks={lecture.blocks!} lectureId={lessonId} immersive />
            ) : lecture.content ? (
              <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10">
                <div className="rounded-[1.5rem] border border-border/70 bg-secondary/35 px-6 py-6 prose prose-sm max-w-none dark:prose-invert">
                  <LegacyLectureContent content={lecture.content} />
                </div>
              </div>
            ) : (
              <div className="px-4 py-10 text-sm text-muted-foreground">
                Содержимое лекции пока пусто.
              </div>
            )}
          </div>
          <TrackLessonNav trackId={trackId} trackTitle={track.title} prev={prev} next={next} />
        </div>
      );
    }

    return shell(
      lecture.title,
      "Читаемая лекционная поверхность с фокусом на контенте и прогрессе по треку.",
      <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Lecture mode</p>
            <p className="text-sm leading-6 text-muted-foreground">Материал собран так, чтобы чтение и переход к следующему шагу не конфликтовали друг с другом.</p>
          </div>
        </div>
      </div>,
      <section className="space-y-4">
        <LectureViewTracker lectureId={lessonId} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LectureHeader lectureId={lessonId} title={lecture.title} />
        </div>
        <div className="rounded-[1.9rem] border border-white/55 bg-background/84 p-5 shadow-[var(--shadow-medium)] backdrop-blur-xl dark:border-white/10 sm:p-6 lg:p-8">
          {hasBlocks ? (
            <LectureBlocks blocks={lecture.blocks!} lectureId={lessonId} />
          ) : lecture.content ? (
            <div className="rounded-[1.5rem] border border-border/70 bg-secondary/35 px-6 py-6 prose prose-sm max-w-none dark:prose-invert">
              <LegacyLectureContent content={lecture.content} />
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-secondary/35 px-6 py-10 text-sm text-muted-foreground">
              Содержимое лекции пока пусто.
            </div>
          )}
        </div>
      </section>
    );
  }

  if (lesson.type === "puzzle") {
    const puzzle = await fetchPuzzleById(lessonId);
    if (!puzzle) notFound();

    return shell(
      puzzle.title,
      "Интерактивный пазл внутри трека с акцентом на задаче и быстрой навигации вперед.",
      undefined,
      <PuzzleView puzzle={puzzle} />
    );
  }

  if (lesson.type === "question") {
    const question = await fetchQuestionById(lessonId);
    if (!question) notFound();

    return shell(
      question.title,
      "Проверочный вопрос, встроенный в учебный поток.",
      undefined,
      <QuestionView question={question} />
    );
  }

  if (lesson.type === "layout") {
    const layout = await fetchLayoutById(lessonId, token);
    if (!layout) notFound();

    return shell(
      layout.title,
      "Практика по верстке и структуре интерфейса с тем же уровнем визуальной ясности.",
      undefined,
      <LayoutView layout={layout} />
    );
  }

  if (lesson.type === "survey") {
    const survey = await fetchSurveyById(lessonId);
    if (!survey) notFound();

    return shell(
      survey.title,
      "Опрос и обратная связь как часть учебного маршрута, а не отдельный выбивающийся модуль.",
      undefined,
      <SurveyView survey={survey} />
    );
  }

  const task = await fetchTaskById(lessonId);
  if (!task) notFound();

  return shell(
    task.title,
    task.description,
    <div className="rounded-[1.5rem] border border-white/55 bg-background/78 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Workspace mode</p>
          <p className="text-sm leading-6 text-muted-foreground">Редактор, тесты и решение находятся в одном спокойном рабочем контуре.</p>
          <AvailabilityCountdown availableUntil={task.availableUntil} className="mt-2 text-xs" />
        </div>
      </div>
    </div>,
    <TaskView task={task} />
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchTracks,
  type OrphanLayout,
  type OrphanLecture,
  type OrphanPuzzle,
  type OrphanQuestion,
  type OrphanSurvey,
  type OrphanTask,
} from "@/lib/api/tracks";
import { fetchNotifications, type Notification } from "@/lib/api/notifications";
import { fetchPlatformCompleted, type PlatformCompletedItem } from "@/lib/api/profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemporaryAssignmentsIndicator } from "@/components/temporary-assignments-indicator";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  Code2,
  HelpCircle,
  Inbox,
  ListChecks,
  MessageCircle,
  Puzzle,
  Search,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import type { Track } from "@/lib/types";
import { parseDateTime } from "@/lib/utils/datetime";
import { Input } from "@/components/ui/input";
import { useNow } from "@/lib/hooks/use-now";

type OrphanItemType = "lecture" | "task" | "puzzle" | "question" | "survey" | "layout";

interface OrphanItem {
  id: string;
  title: string;
  type: OrphanItemType;
  hasDeadline: boolean;
  availableUntil?: string | null;
  availableFrom?: string | null;
  hard?: boolean;
}

function trackProgress(track: Track): { completed: number; total: number; percent: number } {
  const lessons = (track.lessons || []).filter((lesson) =>
    ["lecture", "task", "puzzle", "question", "survey", "layout"].includes(lesson.type)
  );
  const total = lessons.length;
  const completed = lessons.filter((lesson) => {
    const state = track.progress?.[lesson.id];
    return state === "completed" || state === "completed_late";
  }).length;

  return { completed, total, percent: total ? Math.round((100 * completed) / total) : 0 };
}

const ORPHAN_TYPE_CONFIG: Record<
  OrphanItemType,
  { href: (id: string) => string; label: string; action: string; Icon: typeof BookOpen }
> = {
  lecture: { href: (id) => `/lectures/${id}`, label: "Лекция", action: "Открыть лекцию", Icon: BookOpen },
  task: { href: (id) => `/tasks/${id}`, label: "Задание", action: "Открыть задание", Icon: ListChecks },
  puzzle: { href: (id) => `/puzzles/${id}`, label: "Puzzle", action: "Открыть puzzle", Icon: Puzzle },
  question: { href: (id) => `/questions/${id}`, label: "Вопрос", action: "Открыть вопрос", Icon: HelpCircle },
  survey: { href: (id) => `/surveys/${id}`, label: "Опрос", action: "Открыть опрос", Icon: MessageCircle },
  layout: { href: (id) => `/layouts/${id}`, label: "Верстка", action: "Открыть верстку", Icon: Code2 },
};

const TAB_FILTERS: { value: OrphanItemType | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "lecture", label: "Лекции" },
  { value: "task", label: "Задачи" },
  { value: "puzzle", label: "Пазлы" },
  { value: "question", label: "Вопросы" },
  { value: "survey", label: "Опросы" },
  { value: "layout", label: "Верстка" },
];

const EMPTY_LECTURES: OrphanLecture[] = [];
const EMPTY_TASKS: OrphanTask[] = [];
const EMPTY_PUZZLES: OrphanPuzzle[] = [];
const EMPTY_QUESTIONS: OrphanQuestion[] = [];
const EMPTY_SURVEYS: OrphanSurvey[] = [];
const EMPTY_LAYOUTS: OrphanLayout[] = [];
const EMPTY_TRACKS: Track[] = [];

function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Sparkles;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/50 bg-background/80 p-4 shadow-[var(--shadow-soft)] dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em]">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{hint}</p>
    </div>
  );
}

function NotificationBanner({ notification }: { notification: Notification }) {
  const styles: Record<string, string> = {
    info: "border-[hsl(var(--info)/0.18)] bg-[hsl(var(--info)/0.08)] text-foreground",
    success: "border-[hsl(var(--success)/0.18)] bg-[hsl(var(--success)/0.08)] text-foreground",
    warning: "border-[hsl(var(--warning)/0.22)] bg-[hsl(var(--warning)/0.12)] text-foreground",
    error: "border-[hsl(var(--destructive)/0.2)] bg-[hsl(var(--destructive)/0.08)] text-foreground",
  };

  return (
    <div className={`rounded-[1.25rem] border px-4 py-3 text-sm shadow-sm ${styles[notification.level] ?? styles.info}`}>
      {notification.message}
    </div>
  );
}

function OrphanCard({ item }: { item: OrphanItem }) {
  const { href, label, action, Icon } = ORPHAN_TYPE_CONFIG[item.type];

  return (
    <Card className="group flex h-full flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-secondary/80 text-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {label}
                </span>
                {item.type === "task" && item.hard && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
              </div>
            </div>
            <CardTitle className="text-base">{item.title}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em]">
              {item.hasDeadline ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3 w-3" />
                  Временный доступ
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Доступно сейчас
                </span>
              )}
            </CardDescription>
          </div>

          {item.availableUntil && (
            <AvailabilityCountdown availableUntil={item.availableUntil} className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs" />
          )}
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-4">
        <div className="rounded-[1.1rem] bg-secondary/55 px-4 py-3 text-sm leading-6 text-muted-foreground">
          Следующее действие уже определено: откройте материал и продолжайте обучение без лишнего поиска.
        </div>
        <Link href={href(item.id)} className="mt-auto">
          <Button variant="outline" className="w-full justify-between">
            <span>{action}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function MainPage() {
  const [data, setData] = useState<{
    tracks: Track[];
    orphan_lectures: OrphanLecture[];
    orphan_tasks: OrphanTask[];
    orphan_puzzles: OrphanPuzzle[];
    orphan_questions: OrphanQuestion[];
    orphan_surveys: OrphanSurvey[];
    orphan_layouts: OrphanLayout[];
  } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [completedPlatformItems, setCompletedPlatformItems] = useState<PlatformCompletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orphanSearch, setOrphanSearch] = useState("");
  const [orphanTab, setOrphanTab] = useState<string>("all");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [tracksData, notificationsData, completedData] = await Promise.all([
          fetchTracks(),
          fetchNotifications(),
          fetchPlatformCompleted(),
        ]);

        if (mounted) {
          setData(tracksData);
          setNotifications(notificationsData);
          setCompletedPlatformItems(completedData);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const now = useNow(60_000);
  const tracks = data?.tracks ?? EMPTY_TRACKS;
  const rawOrphanLectures = data?.orphan_lectures ?? EMPTY_LECTURES;
  const rawOrphanTasks = data?.orphan_tasks ?? EMPTY_TASKS;
  const rawOrphanPuzzles = data?.orphan_puzzles ?? EMPTY_PUZZLES;
  const rawOrphanQuestions = data?.orphan_questions ?? EMPTY_QUESTIONS;
  const rawOrphanSurveys = data?.orphan_surveys ?? EMPTY_SURVEYS;
  const rawOrphanLayouts = data?.orphan_layouts ?? EMPTY_LAYOUTS;

  const orphanLectureUntilTsById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const item of rawOrphanLectures) {
      const date = parseDateTime(item.available_until ?? null);
      map.set(item.id, date ? date.getTime() : null);
    }
    return map;
  }, [rawOrphanLectures]);

  const orphanTaskUntilTsById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const item of rawOrphanTasks) {
      const date = parseDateTime(item.available_until ?? null);
      map.set(item.id, date ? date.getTime() : null);
    }
    return map;
  }, [rawOrphanTasks]);

  const orphanPuzzleUntilTsById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const item of rawOrphanPuzzles) {
      const date = parseDateTime(item.available_until ?? null);
      map.set(item.id, date ? date.getTime() : null);
    }
    return map;
  }, [rawOrphanPuzzles]);

  const orphanQuestionUntilTsById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const item of rawOrphanQuestions) {
      const date = parseDateTime(item.available_until ?? null);
      map.set(item.id, date ? date.getTime() : null);
    }
    return map;
  }, [rawOrphanQuestions]);

  const orphanSurveyUntilTsById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const item of rawOrphanSurveys) {
      const date = parseDateTime(item.available_until ?? null);
      map.set(item.id, date ? date.getTime() : null);
    }
    return map;
  }, [rawOrphanSurveys]);

  const orphanLayoutUntilTsById = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const item of rawOrphanLayouts) {
      const date = parseDateTime(item.available_until ?? null);
      map.set(item.id, date ? date.getTime() : null);
    }
    return map;
  }, [rawOrphanLayouts]);

  const completedStandaloneKeySet = useMemo(() => {
    const set = new Set<string>();
    for (const item of completedPlatformItems) {
      if (item.status === "completed" || item.status === "completed_late") {
        set.add(`${item.lesson_type}:${item.lesson_id}`);
      }
    }
    return set;
  }, [completedPlatformItems]);

  const orphanLectures = useMemo(
    () =>
      rawOrphanLectures.filter((item) => {
        const ts = orphanLectureUntilTsById.get(item.id) ?? null;
        return (ts == null || ts > now) && !completedStandaloneKeySet.has(`lecture:${item.id}`);
      }),
    [completedStandaloneKeySet, now, orphanLectureUntilTsById, rawOrphanLectures]
  );

  const orphanTasks = useMemo(
    () =>
      rawOrphanTasks.filter((item) => {
        const ts = orphanTaskUntilTsById.get(item.id) ?? null;
        return (ts == null || ts > now) && !completedStandaloneKeySet.has(`task:${item.id}`);
      }),
    [completedStandaloneKeySet, now, orphanTaskUntilTsById, rawOrphanTasks]
  );

  const orphanPuzzles = useMemo(
    () =>
      rawOrphanPuzzles.filter((item) => {
        const ts = orphanPuzzleUntilTsById.get(item.id) ?? null;
        return (ts == null || ts > now) && !completedStandaloneKeySet.has(`puzzle:${item.id}`);
      }),
    [completedStandaloneKeySet, now, orphanPuzzleUntilTsById, rawOrphanPuzzles]
  );

  const orphanQuestions = useMemo(
    () =>
      rawOrphanQuestions.filter((item) => {
        const ts = orphanQuestionUntilTsById.get(item.id) ?? null;
        return (ts == null || ts > now) && !completedStandaloneKeySet.has(`question:${item.id}`);
      }),
    [completedStandaloneKeySet, now, orphanQuestionUntilTsById, rawOrphanQuestions]
  );

  const orphanSurveys = useMemo(
    () =>
      rawOrphanSurveys.filter((item) => {
        const ts = orphanSurveyUntilTsById.get(item.id) ?? null;
        return (ts == null || ts > now) && !completedStandaloneKeySet.has(`survey:${item.id}`);
      }),
    [completedStandaloneKeySet, now, orphanSurveyUntilTsById, rawOrphanSurveys]
  );

  const orphanLayouts = useMemo(
    () =>
      rawOrphanLayouts.filter((item) => {
        const ts = orphanLayoutUntilTsById.get(item.id) ?? null;
        return (ts == null || ts > now) && !completedStandaloneKeySet.has(`layout:${item.id}`);
      }),
    [completedStandaloneKeySet, now, orphanLayoutUntilTsById, rawOrphanLayouts]
  );

  const orphanItems = useMemo((): OrphanItem[] => {
    return [
      ...orphanLectures.map((item) => ({
        id: item.id,
        title: item.title,
        type: "lecture" as const,
        hasDeadline: Boolean(item.available_until || item.available_from),
        availableUntil: item.available_until ?? null,
        availableFrom: item.available_from ?? null,
      })),
      ...orphanTasks.map((item) => ({
        id: item.id,
        title: item.title,
        type: "task" as const,
        hard: item.hard,
        hasDeadline: Boolean(item.available_until || item.available_from),
        availableUntil: item.available_until ?? null,
        availableFrom: item.available_from ?? null,
      })),
      ...orphanPuzzles.map((item) => ({
        id: item.id,
        title: item.title,
        type: "puzzle" as const,
        hasDeadline: Boolean(item.available_until || item.available_from),
        availableUntil: item.available_until ?? null,
        availableFrom: item.available_from ?? null,
      })),
      ...orphanQuestions.map((item) => ({
        id: item.id,
        title: item.title,
        type: "question" as const,
        hasDeadline: Boolean(item.available_until || item.available_from),
        availableUntil: item.available_until ?? null,
        availableFrom: item.available_from ?? null,
      })),
      ...orphanSurveys.map((item) => ({
        id: item.id,
        title: item.title,
        type: "survey" as const,
        hasDeadline: Boolean(item.available_until || item.available_from),
        availableUntil: item.available_until ?? null,
        availableFrom: item.available_from ?? null,
      })),
      ...orphanLayouts.map((item) => ({
        id: item.id,
        title: item.title,
        type: "layout" as const,
        hasDeadline: Boolean(item.available_until || item.available_from),
        availableUntil: item.available_until ?? null,
        availableFrom: item.available_from ?? null,
      })),
    ];
  }, [orphanLectures, orphanLayouts, orphanPuzzles, orphanQuestions, orphanSurveys, orphanTasks]);

  const filteredOrphanItems = useMemo(() => {
    let items = [...orphanItems].sort((a, b) => Number(b.hasDeadline) - Number(a.hasDeadline));
    if (orphanTab !== "all") items = items.filter((item) => item.type === orphanTab);
    if (orphanSearch.trim()) {
      const query = orphanSearch.trim().toLowerCase();
      items = items.filter((item) => item.title.toLowerCase().includes(query));
    }
    return items;
  }, [orphanItems, orphanSearch, orphanTab]);

  const totalLessons = tracks.reduce((sum, track) => sum + trackProgress(track).total, 0);
  const totalCompleted = tracks.reduce((sum, track) => sum + trackProgress(track).completed, 0);
  const overdueCount = orphanItems.filter((item) => item.hasDeadline).length;
  const activeTracks = tracks.filter((track) => trackProgress(track).total > 0).length;
  const featuredTrack = [...tracks].sort((a, b) => trackProgress(b).percent - trackProgress(a).percent)[0] ?? null;
  const hasContent = tracks.length > 0 || orphanItems.length > 0;

  return (
    <div className="content-block">
      {notifications.length > 0 && (
        <section className="space-y-2">
          {notifications.map((notification) => (
            <NotificationBanner key={notification.id} notification={notification} />
          ))}
        </section>
      )}

      <section className="hero-surface p-6 sm:p-7 lg:p-8">
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-6">
            <span className="kavnt-badge">Student main dashboard</span>
            <PageHeader
              title="Учебный центр"
              description="Продолжайте движение по трекам, быстро считывайте дедлайны и открывайте нужный материал без лишних переходов."
              compact
              className="mb-0"
              actions={
                <TemporaryAssignmentsIndicator
                  orphanLectures={orphanLectures}
                  orphanTasks={orphanTasks}
                  orphanPuzzles={orphanPuzzles}
                  orphanQuestions={orphanQuestions}
                  orphanLayouts={orphanLayouts}
                />
              }
            />

            <div className="grid gap-4 md:grid-cols-3">
              <MetricTile
                label="Активные треки"
                value={String(activeTracks)}
                hint="Собранные в одном месте маршруты обучения и прогресс по ним."
                icon={BookOpen}
              />
              <MetricTile
                label="Завершено"
                value={`${totalCompleted}/${totalLessons || 0}`}
                hint="Общий объем выполненного материала по всем текущим программам."
                icon={Trophy}
              />
              <MetricTile
                label="Нуждается во внимании"
                value={String(overdueCount)}
                hint="Материалы с временным доступом и ближайшими точками принятия решения."
                icon={Clock}
              />
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-4">
            <Card className="border-white/60 bg-background/80">
              <CardHeader className="space-y-3 pb-5">
                <CardDescription>Next action</CardDescription>
                <CardTitle className="text-[1.6rem] leading-tight">
                  {featuredTrack ? featuredTrack.title : "Выберите первый трек"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-1">
                <p className="text-sm leading-6 text-muted-foreground">
                  {featuredTrack
                    ? featuredTrack.description || "Трек с наибольшим текущим прогрессом и самым понятным продолжением."
                    : "Когда материалы появятся, здесь будет главный рекомендованный шаг для продолжения обучения."}
                </p>
                {featuredTrack && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Прогресс</span>
                      <span>{trackProgress(featuredTrack).percent}%</span>
                    </div>
                    <Progress value={trackProgress(featuredTrack).percent} className="h-2.5" />
                  </div>
                )}
                <Link href={featuredTrack ? `/main/${featuredTrack.id}` : "/tracks"} className="block pt-2">
                  <Button className="w-full justify-between">
                    <span>{featuredTrack ? "Продолжить трек" : "Открыть каталог"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-white/50 bg-background/76">
                <CardHeader className="pb-3">
                  <CardDescription>Состояние обучения</CardDescription>
                  <CardTitle className="text-base">Спокойная иерархия</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-muted-foreground">
                  Приоритеты, прогресс и дедлайны собраны в короткие сканируемые блоки.
                </CardContent>
              </Card>
              <Card className="border-white/50 bg-background/76">
                <CardHeader className="pb-3">
                  <CardDescription>Theme-ready</CardDescription>
                  <CardTitle className="text-base">Semantic tokens first</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-muted-foreground">
                  Компоненты зависят от semantic roles и готовы к смене brand palette.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : !hasContent ? (
        <EmptyState
          icon={Inbox}
          title="Нет доступных треков"
          description="Войдите в аккаунт или дождитесь назначения материалов, чтобы увидеть учебные маршруты."
        />
      ) : (
        <div className="space-y-10">
          {tracks.length > 0 && (
            <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="section-title">Учебные треки</h2>
                  <p className="section-caption">Каждый трек показывает прогресс, состав и понятное следующее действие.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {tracks.map((track) => {
                  const progress = trackProgress(track);

                  return (
                    <Card key={track.id} className="flex h-full flex-col">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <CardTitle>{track.title}</CardTitle>
                            {track.description && <CardDescription>{track.description}</CardDescription>}
                          </div>
                          <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-xs font-semibold text-muted-foreground">
                            {progress.completed}/{progress.total || 0}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="mt-auto space-y-5">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Прогресс</span>
                            <span>{progress.percent}%</span>
                          </div>
                          <Progress value={progress.percent} className="h-2.5" />
                        </div>

                        <div className="rounded-[1.25rem] bg-secondary/55 p-4">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Состав трека</p>
                          <ul className="space-y-2 text-sm">
                            {(track.lessons || []).slice(0, 4).map((lesson) => {
                              const state = track.progress?.[lesson.id];
                              const isDone = state === "completed" || state === "completed_late";

                              return (
                                <li key={lesson.id} className="flex items-center gap-2 text-muted-foreground">
                                  {isDone ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
                                  ) : lesson.type === "lecture" ? (
                                    <BookOpen className="h-4 w-4 shrink-0" />
                                  ) : (
                                    <ListChecks className="h-4 w-4 shrink-0" />
                                  )}
                                  <span className={isDone ? "text-foreground" : ""}>{lesson.title}</span>
                                </li>
                              );
                            })}
                            {(track.lessons || []).length > 4 && (
                              <li className="pt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground/75">
                                +{(track.lessons || []).length - 4} элементов
                              </li>
                            )}
                          </ul>
                        </div>

                        <Link href={`/main/${track.id}`} className="mt-auto block">
                          <Button variant="outline" className="w-full justify-between">
                            <span>Открыть трек</span>
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {orphanItems.length > 0 && (
            <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="section-title">Отдельные задания</h2>
                  <p className="section-caption">Сюда попадают самостоятельные материалы, временные окна доступа и быстрые точки возврата.</p>
                </div>
              </div>

              <Tabs value={orphanTab} onValueChange={setOrphanTab} className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <TabsList className="w-full justify-start lg:w-fit">
                    {TAB_FILTERS.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <div className="relative w-full lg:ml-auto lg:max-w-sm">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Поиск по отдельным заданиям"
                      value={orphanSearch}
                      onChange={(e) => setOrphanSearch(e.target.value)}
                      className="pl-11"
                    />
                  </div>
                </div>

                <TabsContent value={orphanTab}>
                  {filteredOrphanItems.length === 0 ? (
                    <EmptyState
                      icon={Search}
                      title="Ничего не найдено"
                      description="Измените фильтр или поисковый запрос, чтобы увидеть доступные материалы."
                      className="py-12"
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                      {filteredOrphanItems.map((item) => (
                        <OrphanCard key={`${item.type}-${item.id}`} item={item} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

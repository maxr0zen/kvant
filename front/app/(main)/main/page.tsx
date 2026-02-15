"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchTracks, type OrphanLecture, type OrphanTask, type OrphanPuzzle, type OrphanQuestion, type OrphanSurvey } from "@/lib/api/tracks";
import { fetchNotifications, type Notification } from "@/lib/api/notifications";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemporaryAssignmentsIndicator } from "@/components/temporary-assignments-indicator";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { BookOpen, ListChecks, CheckCircle2, Star, Puzzle, HelpCircle, Clock, Search, MessageCircle, Inbox } from "lucide-react";
import type { Track } from "@/lib/types";
import { parseDateTime } from "@/lib/utils/datetime";
import { Input } from "@/components/ui/input";

type OrphanItemType = "lecture" | "task" | "puzzle" | "question" | "survey";

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
  const lessons = (track.lessons || []).filter(
    (l) => l.type === "lecture" || l.type === "task" || l.type === "puzzle" || l.type === "question" || l.type === "survey"
  );
  const total = lessons.length;
  const completed = lessons.filter((l) => {
    const st = track.progress?.[l.id];
    return st === "completed" || st === "completed_late";
  }).length;
  return { completed, total, percent: total ? Math.round((100 * completed) / total) : 0 };
}

const ORPHAN_TYPE_CONFIG: Record<
  OrphanItemType,
  { href: (id: string) => string; label: string; buttonText: string; Icon: typeof BookOpen }
> = {
  lecture: { href: (id) => `/lectures/${id}`, label: "Лекция", buttonText: "Открыть", Icon: BookOpen },
  task: { href: (id) => `/tasks/${id}`, label: "Задание", buttonText: "Открыть", Icon: ListChecks },
  puzzle: { href: (id) => `/puzzles/${id}`, label: "Puzzle", buttonText: "Открыть", Icon: Puzzle },
  question: { href: (id) => `/questions/${id}`, label: "Вопрос", buttonText: "Открыть", Icon: HelpCircle },
  survey: { href: (id) => `/surveys/${id}`, label: "Опрос", buttonText: "Открыть", Icon: MessageCircle },
};

function OrphanCard({ item }: { item: OrphanItem }) {
  const { href, label, buttonText, Icon } = ORPHAN_TYPE_CONFIG[item.type];
  const isTemp = item.hasDeadline;
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{item.title}</span>
              {item.type === "task" && item.hard && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />}
            </CardTitle>
            <CardDescription className="mt-0.5 flex items-center gap-1.5">
              {label}
              {isTemp && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Временное
                </span>
              )}
            </CardDescription>
          </div>
          {item.availableUntil && (
            <AvailabilityCountdown availableUntil={item.availableUntil} className="shrink-0 text-xs" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex items-end pt-2">
        <Link href={href(item.id)} className="w-full">
          <Button variant="outline" size="sm" className="w-full">
            {buttonText}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

const TAB_FILTERS: { value: OrphanItemType | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "lecture", label: "Лекции" },
  { value: "task", label: "Задачи" },
  { value: "puzzle", label: "Пазлы" },
  { value: "question", label: "Вопросы" },
  { value: "survey", label: "Опросы" },
];

export default function MainPage() {
  const [data, setData] = useState<{
    tracks: Track[];
    orphan_lectures: OrphanLecture[];
    orphan_tasks: OrphanTask[];
    orphan_puzzles: OrphanPuzzle[];
    orphan_questions: OrphanQuestion[];
    orphan_surveys: OrphanSurvey[];
  } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [t, notif] = await Promise.all([fetchTracks(), fetchNotifications()]);
        if (mounted) {
          setData(t);
          setNotifications(notif);
        }
      } catch (e) {
        // silent
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const tracks = data?.tracks ?? [];
  const rawOrphanLectures = data?.orphan_lectures ?? [];
  const rawOrphanTasks = data?.orphan_tasks ?? [];
  const rawOrphanPuzzles = data?.orphan_puzzles ?? [];
  const rawOrphanQuestions = data?.orphan_questions ?? [];
  const rawOrphanSurveys = data?.orphan_surveys ?? [];

  const stillAvailable = useMemo(() => {
    const untilTs = (item: { available_until?: string | null; availableUntil?: string | null }) => {
      const u = item.available_until ?? (item as { availableUntil?: string | null }).availableUntil;
      const d = parseDateTime(u ?? null);
      return d ? d.getTime() : null;
    };
    return {
      lecture: (lec: OrphanLecture) => {
        const ts = untilTs(lec);
        return ts == null || ts > now;
      },
      task: (task: OrphanTask) => {
        const ts = untilTs(task);
        return ts == null || ts > now;
      },
      puzzle: (p: OrphanPuzzle) => {
        const ts = untilTs(p);
        return ts == null || ts > now;
      },
      question: (q: OrphanQuestion) => {
        const ts = untilTs(q);
        return ts == null || ts > now;
      },
      survey: (s: OrphanSurvey) => {
        const ts = untilTs(s);
        return ts == null || ts > now;
      },
    };
  }, [now]);

  const orphanLectures = useMemo(() => rawOrphanLectures.filter(stillAvailable.lecture), [rawOrphanLectures, stillAvailable.lecture]);
  const orphanTasks = useMemo(() => rawOrphanTasks.filter(stillAvailable.task), [rawOrphanTasks, stillAvailable.task]);
  const orphanPuzzles = useMemo(() => rawOrphanPuzzles.filter(stillAvailable.puzzle), [rawOrphanPuzzles, stillAvailable.puzzle]);
  const orphanQuestions = useMemo(() => rawOrphanQuestions.filter(stillAvailable.question), [rawOrphanQuestions, stillAvailable.question]);
  const orphanSurveys = useMemo(() => rawOrphanSurveys.filter(stillAvailable.survey), [rawOrphanSurveys, stillAvailable.survey]);

  const [orphanSearch, setOrphanSearch] = useState("");
  const [orphanTab, setOrphanTab] = useState<string>("all");

  const orphanItems = useMemo((): OrphanItem[] => {
    const list: OrphanItem[] = [];
    for (const lec of orphanLectures) {
      const until = lec.available_until ?? (lec as { availableUntil?: string | null }).availableUntil;
      const from = lec.available_from ?? (lec as { availableFrom?: string | null }).availableFrom;
      list.push({
        id: lec.id,
        title: lec.title,
        type: "lecture",
        hasDeadline: !!(until ?? from),
        availableUntil: until ?? null,
        availableFrom: from ?? null,
      });
    }
    for (const t of orphanTasks) {
      const until = (t as { available_until?: string | null }).available_until ?? (t as { availableUntil?: string | null }).availableUntil;
      const from = (t as { available_from?: string | null }).available_from ?? (t as { availableFrom?: string | null }).availableFrom;
      list.push({
        id: t.id,
        title: t.title,
        type: "task",
        hasDeadline: !!(until ?? from),
        availableUntil: until ?? null,
        availableFrom: from ?? null,
        hard: t.hard,
      });
    }
    for (const p of orphanPuzzles) {
      const until = (p as { available_until?: string | null }).available_until ?? (p as { availableUntil?: string | null }).availableUntil;
      const from = (p as { available_from?: string | null }).available_from ?? (p as { availableFrom?: string | null }).availableFrom;
      list.push({
        id: p.id,
        title: p.title,
        type: "puzzle",
        hasDeadline: !!(until ?? from),
        availableUntil: until ?? null,
        availableFrom: from ?? null,
      });
    }
    for (const q of orphanQuestions) {
      const until = (q as { available_until?: string | null }).available_until ?? (q as { availableUntil?: string | null }).availableUntil;
      const from = (q as { available_from?: string | null }).available_from ?? (q as { availableFrom?: string | null }).availableFrom;
      list.push({
        id: q.id,
        title: q.title,
        type: "question",
        hasDeadline: !!(until ?? from),
        availableUntil: until ?? null,
        availableFrom: from ?? null,
      });
    }
    for (const s of orphanSurveys) {
      const until = (s as { available_until?: string | null }).available_until ?? (s as { availableUntil?: string | null }).availableUntil;
      const from = (s as { available_from?: string | null }).available_from ?? (s as { availableFrom?: string | null }).availableFrom;
      list.push({
        id: s.id,
        title: s.title,
        type: "survey",
        hasDeadline: !!(until ?? from),
        availableUntil: until ?? null,
        availableFrom: from ?? null,
      });
    }
    return list;
  }, [orphanLectures, orphanTasks, orphanPuzzles, orphanQuestions, orphanSurveys]);

  const orphanItemsSortedAndFiltered = useMemo(() => {
    let items = [...orphanItems];
    items.sort((a, b) => {
      if (a.hasDeadline !== b.hasDeadline) return a.hasDeadline ? -1 : 1;
      return 0;
    });
    if (orphanTab && orphanTab !== "all") {
      items = items.filter((i) => i.type === orphanTab);
    }
    if (orphanSearch.trim()) {
      const q = orphanSearch.trim().toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(q));
    }
    return items;
  }, [orphanItems, orphanTab, orphanSearch]);

  const hasContent = tracks.length > 0 || orphanItems.length > 0;

  const notificationLevelClass: Record<string, string> = {
    info: "border-blue-500/30 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
    success: "border-green-500/30 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200",
    warning: "border-amber-500/30 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
    error: "border-red-500/30 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200",
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border px-4 py-3 text-sm ${notificationLevelClass[n.level] ?? notificationLevelClass.info}`}
              role="alert"
            >
              {n.message}
            </div>
          ))}
        </div>
      )}

      {/* Page header */}
      <PageHeader
        title="Треки"
        description="Выберите трек или отдельное задание"
        actions={
          <TemporaryAssignmentsIndicator
            orphanLectures={orphanLectures}
            orphanTasks={orphanTasks}
            orphanPuzzles={orphanPuzzles}
            orphanQuestions={orphanQuestions}
            className=""
          />
        }
      />

      {/* Loading */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : !hasContent ? (
        <EmptyState
          icon={Inbox}
          title="Нет доступных треков"
          description="Войдите в аккаунт, чтобы увидеть доступные учебные материалы."
        />
      ) : (
        <div className="space-y-10">
          {/* Tracks grid */}
          {tracks.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Учебные треки</h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {tracks.map((track) => {
                  const { completed, total, percent } = trackProgress(track);
                  return (
                    <Card key={track.id} className="flex flex-col">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary shrink-0" />
                          {track.title}
                        </CardTitle>
                        {track.description && (
                          <CardDescription className="line-clamp-2">{track.description}</CardDescription>
                        )}
                        {total > 0 && (
                          <div className="pt-2 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Прогресс</span>
                              <span>{completed}/{total}</span>
                            </div>
                            <Progress value={percent} className="h-1.5" />
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col gap-2">
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {(track.lessons || []).slice(0, 4).map((lesson: { id: string; type: string; title: string; hard?: boolean }) => {
                            const st = track.progress?.[lesson.id];
                            const isDone = st === "completed" || st === "completed_late";
                            return (
                              <li key={lesson.id} className="flex items-center gap-2">
                                {isDone ? (
                                  <CheckCircle2 className="h-3 w-3 shrink-0 text-brand-green" />
                                ) : lesson.type === "lecture" ? (
                                  <BookOpen className="h-3 w-3 shrink-0" />
                                ) : (
                                  <ListChecks className="h-3 w-3 shrink-0" />
                                )}
                                {lesson.hard && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />}
                                <span className={isDone ? "text-brand-green" : "truncate"}>
                                  {lesson.title}
                                </span>
                              </li>
                            );
                          })}
                          {(track.lessons || []).length > 4 && (
                            <li className="text-muted-foreground/60 text-xs">
                              +{(track.lessons || []).length - 4} ещё
                            </li>
                          )}
                        </ul>
                        <Link href={`/main/${track.id}`} className="mt-auto pt-3">
                          <Button variant="outline" size="sm" className="w-full">
                            Открыть трек
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Orphan items with tabs */}
          {orphanItems.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Отдельные задания</h2>

              <Tabs value={orphanTab} onValueChange={setOrphanTab} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <TabsList className="w-fit">
                    {TAB_FILTERS.map((t) => (
                      <TabsTrigger key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="relative sm:ml-auto max-w-xs w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Поиск..."
                      value={orphanSearch}
                      onChange={(e) => setOrphanSearch(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </div>

                <TabsContent value={orphanTab} className="mt-0">
                  {orphanItemsSortedAndFiltered.length === 0 ? (
                    <EmptyState
                      icon={Search}
                      title="Ничего не найдено"
                      description="Попробуйте изменить фильтр или поисковый запрос."
                      className="py-12"
                    />
                  ) : (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {orphanItemsSortedAndFiltered.map((item) => (
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

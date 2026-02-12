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
import { TemporaryAssignmentsIndicator } from "@/components/temporary-assignments-indicator";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { BookOpen, ListChecks, CheckCircle2, Star, Puzzle, HelpCircle, Clock, Search, Filter, MessageCircle } from "lucide-react";
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
  lecture: { href: (id) => `/lectures/${id}`, label: "Лекция", buttonText: "Открыть лекцию", Icon: BookOpen },
  task: { href: (id) => `/tasks/${id}`, label: "Задание", buttonText: "Открыть задание", Icon: ListChecks },
  puzzle: { href: (id) => `/puzzles/${id}`, label: "Puzzle", buttonText: "Открыть puzzle", Icon: Puzzle },
  question: { href: (id) => `/questions/${id}`, label: "Вопрос", buttonText: "Открыть вопрос", Icon: HelpCircle },
  survey: { href: (id) => `/surveys/${id}`, label: "Опрос", buttonText: "Открыть опрос", Icon: MessageCircle },
};

function OrphanCard({ item }: { item: OrphanItem }) {
  const { href, label, buttonText, Icon } = ORPHAN_TYPE_CONFIG[item.type];
  const isTemp = item.hasDeadline;
  return (
    <Card className="flex flex-col border-primary/10 hover:border-primary/25 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
              <Icon className="h-5 w-5 shrink-0" />
              {item.title}
              {item.type === "task" && item.hard && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" />}
              {isTemp && (
                <span className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Временное
                </span>
              )}
            </CardTitle>
            <CardDescription>{label}</CardDescription>
          </div>
          {item.availableUntil && (
            <AvailabilityCountdown availableUntil={item.availableUntil} className="shrink-0 text-xs" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        <Link href={href(item.id)} className="mt-auto pt-4">
          <Button variant="outline" size="sm" className="w-full">
            {buttonText}
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
  const [orphanTypeFilter, setOrphanTypeFilter] = useState<OrphanItemType | "">("");

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
    if (orphanTypeFilter) {
      items = items.filter((i) => i.type === orphanTypeFilter);
    }
    if (orphanSearch.trim()) {
      const q = orphanSearch.trim().toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(q));
    }
    return items;
  }, [orphanItems, orphanTypeFilter, orphanSearch]);

  const hasContent = tracks.length > 0 || orphanItems.length > 0;

  const notificationLevelClass: Record<string, string> = {
    info: "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200",
    success: "border-green-500/40 bg-green-500/10 text-green-800 dark:text-green-200",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    error: "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200",
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border px-4 py-3 text-sm ${notificationLevelClass[n.level] ?? notificationLevelClass.info}`}
              role="alert"
            >
              {n.message}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl mb-1">Треки</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Выберите трек или отдельную лекцию/задание.
          </p>
        </div>
        <div className="shrink-0 sm:ml-auto">
          <TemporaryAssignmentsIndicator
            orphanLectures={orphanLectures}
            orphanTasks={orphanTasks}
            orphanPuzzles={orphanPuzzles}
            orphanQuestions={orphanQuestions}
            className=""
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        </div>
      ) : !hasContent ? (
        <div className="py-12 sm:py-16">
          <p className="font-medium text-muted-foreground">Нет доступных треков</p>
          <p className="text-sm text-muted-foreground/80 mt-1">Выполните вход.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {tracks.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium">Треки</h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {tracks.map((track) => {
                  const { completed, total, percent } = trackProgress(track);
                  return (
                    <Card key={track.id} className="flex flex-col border-primary/10 hover:border-primary/25 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BookOpen className="h-5 w-5" />
                          {track.title}
                        </CardTitle>
                        <CardDescription>{track.description}</CardDescription>
                        {total > 0 && (
                          <div className="pt-2 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Прогресс</span>
                              <span>{completed} / {total}</span>
                            </div>
                            <Progress value={percent} className="h-2" />
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
                                <span className={isDone ? "text-brand-green" : ""}>
                                  {lesson.title}
                                </span>
                              </li>
                            );
                          })}
                          {(track.lessons || []).length > 4 && (
                            <li className="text-muted-foreground/80">
                              и ещё {(track.lessons || []).length - 4}...
                            </li>
                          )}
                        </ul>
                        <Link href={`/main/${track.id}`} className="mt-auto pt-4">
                          <Button variant="outline" size="sm" className="w-full">
                            Открыть трек
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {orphanItems.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium">Отдельные лекции и задания</h2>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Поиск по названию..."
                    value={orphanSearch}
                    onChange={(e) => setOrphanSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground shrink-0">Тип:</span>
                  <Button
                    variant={orphanTypeFilter === "" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrphanTypeFilter("")}
                  >
                    Все
                  </Button>
                  <Button
                    variant={orphanTypeFilter === "lecture" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrphanTypeFilter("lecture")}
                  >
                    Лекции
                  </Button>
                  <Button
                    variant={orphanTypeFilter === "task" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrphanTypeFilter("task")}
                  >
                    Задачи
                  </Button>
                  <Button
                    variant={orphanTypeFilter === "puzzle" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrphanTypeFilter("puzzle")}
                  >
                    Пазлы
                  </Button>
                  <Button
                    variant={orphanTypeFilter === "question" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrphanTypeFilter("question")}
                  >
                    Вопросы
                  </Button>
                  <Button
                    variant={orphanTypeFilter === "survey" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrphanTypeFilter("survey")}
                  >
                    Опросы
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {orphanItemsSortedAndFiltered.length === 0 ? (
                  <p className="text-sm text-muted-foreground col-span-full">Ничего не найдено.</p>
                ) : (
                  orphanItemsSortedAndFiltered.map((item) => (
                    <OrphanCard key={`${item.type}-${item.id}`} item={item} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

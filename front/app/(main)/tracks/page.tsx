"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchTracks } from "@/lib/api/tracks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ListChecks, CheckCircle2, Star } from "lucide-react";
import type { Track } from "@/lib/types";

function trackProgress(track: Track): { completed: number; total: number; percent: number } {
  const lessons = (track.lessons || []).filter(
    (l) => l.type === "lecture" || l.type === "task" || l.type === "puzzle" || l.type === "question"
  );
  const total = lessons.length;
  const completed = lessons.filter((l) => track.progress?.[l.id] === "completed").length;
  return { completed, total, percent: total ? Math.round((100 * completed) / total) : 0 };
}

export default function TracksPage() {
  const [data, setData] = useState<{ tracks: Track[]; orphan_lectures: { id: string; title: string }[]; orphan_tasks: { id: string; title: string; hard?: boolean }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const t = await fetchTracks();
        if (mounted) setData(t);
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

  const tracks = data?.tracks ?? [];
  const orphanLectures = data?.orphan_lectures ?? [];
  const orphanTasks = data?.orphan_tasks ?? [];
  const hasContent = tracks.length > 0 || orphanLectures.length > 0 || orphanTasks.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Треки</h1>
        <p className="text-muted-foreground mt-1">
          Выберите трек или отдельную лекцию/задание.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Загрузка...</div>
      ) : !hasContent ? (
        <div className="text-sm text-muted-foreground">Нет доступных треков. Выполните вход.</div>
      ) : (
        <div className="space-y-8">
          {tracks.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-4">Треки</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tracks.map((track) => {
                  const { completed, total, percent } = trackProgress(track);
                  return (
                    <Card key={track.id} className="flex flex-col border-primary/10 hover:border-primary/25 transition-colors">
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
                          {(track.lessons || []).slice(0, 4).map((lesson: { id: string; type: string; title: string; hard?: boolean }) => (
                            <li key={lesson.id} className="flex items-center gap-2">
                              {track.progress?.[lesson.id] === "completed" ? (
                                <CheckCircle2 className="h-3 w-3 shrink-0 text-brand-green" />
                              ) : lesson.type === "lecture" ? (
                                <BookOpen className="h-3 w-3 shrink-0" />
                              ) : (
                                <ListChecks className="h-3 w-3 shrink-0" />
                              )}
                              {lesson.hard && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />}
                              <span className={track.progress?.[lesson.id] === "completed" ? "text-brand-green" : ""}>
                                {lesson.title}
                              </span>
                            </li>
                          ))}
                          {(track.lessons || []).length > 4 && (
                            <li className="text-muted-foreground/80">
                              и ещё {(track.lessons || []).length - 4}...
                            </li>
                          )}
                        </ul>
                        <Link href={`/tracks/${track.id}`} className="mt-auto pt-4">
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

          {(orphanLectures.length > 0 || orphanTasks.length > 0) && (
            <div>
              <h2 className="text-lg font-medium mb-4">Отдельные лекции и задания</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {orphanLectures.map((lec) => (
                  <Card key={lec.id} className="flex flex-col border-primary/10 hover:border-primary/25 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        {lec.title}
                      </CardTitle>
                      <CardDescription>Лекция</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-2">
                      <Link href={`/lectures/${lec.id}`} className="mt-auto pt-4">
                        <Button variant="outline" size="sm" className="w-full">
                          Открыть лекцию
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
                {orphanTasks.map((task) => (
                  <Card key={task.id} className="flex flex-col border-primary/10 hover:border-primary/25 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ListChecks className="h-5 w-5" />
                        {task.title}
                        {task.hard && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" />}
                      </CardTitle>
                      <CardDescription>Задание</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-2">
                      <Link href={`/tasks/${task.id}`} className="mt-auto pt-4">
                        <Button variant="outline" size="sm" className="w-full">
                          Открыть задание
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

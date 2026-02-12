"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getStoredRole } from "@/lib/api/auth";
import {
  fetchTracks,
  updateTrack,
  type OrphanLecture,
  type OrphanTask,
  type OrphanPuzzle,
  type OrphanQuestion,
  type OrphanSurvey,
} from "@/lib/api/tracks";
import { useToast } from "@/components/ui/use-toast";
import type { Track, LessonRef } from "@/lib/types";
import {
  BookOpen,
  ListChecks,
  Puzzle,
  HelpCircle,
  ClipboardList,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  PenLine,
} from "lucide-react";

const LESSON_TYPES: LessonRef["type"][] = ["lecture", "task", "puzzle", "question", "survey"];

const TYPE_LABELS: Record<LessonRef["type"], string> = {
  lecture: "Лекция",
  task: "Задача",
  puzzle: "Puzzle",
  question: "Вопрос",
  survey: "Опрос",
};

const TYPE_ICONS: Record<LessonRef["type"], React.ComponentType<{ className?: string }>> = {
  lecture: BookOpen,
  task: ListChecks,
  puzzle: Puzzle,
  question: HelpCircle,
  survey: ClipboardList,
};

interface TrackEditLessonsProps {
  track: Track;
  trackId: string;
}

export function TrackEditLessons({ track, trackId }: TrackEditLessonsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isTeacher, setIsTeacher] = useState(false);
  const [editing, setEditing] = useState(false);
  const [orphans, setOrphans] = useState<{
    orphan_lectures: OrphanLecture[];
    orphan_tasks: OrphanTask[];
    orphan_puzzles: OrphanPuzzle[];
    orphan_questions: OrphanQuestion[];
    orphan_surveys: OrphanSurvey[];
  } | null>(null);
  const [lessons, setLessons] = useState<LessonRef[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingOrphans, setLoadingOrphans] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [pendingAddedLesson, setPendingAddedLesson] = useState<{
    id: string;
    type: LessonRef["type"];
    title: string;
  } | null>(null);

  useEffect(() => {
    setIsTeacher(getStoredRole() === "teacher" || getStoredRole() === "superuser");
  }, []);

  // Read added lesson from URL (after creating from track context) — open edit and remember to add after load
  useEffect(() => {
    const added = searchParams.get("added");
    const id = searchParams.get("id");
    const title = searchParams.get("title");
    const typeParam = searchParams.get("type") as LessonRef["type"] | null;
    if (added && id && title && typeParam && LESSON_TYPES.includes(typeParam)) {
      setEditing(true);
      setPendingAddedLesson({ id, type: typeParam, title: decodeURIComponent(title) });
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (editing && !orphans) {
      setLoadingOrphans(true);
      fetchTracks()
        .then((data) => {
          setOrphans({
            orphan_lectures: data.orphan_lectures,
            orphan_tasks: data.orphan_tasks,
            orphan_puzzles: data.orphan_puzzles,
            orphan_questions: data.orphan_questions,
            orphan_surveys: data.orphan_surveys,
          });
          const trackFromApi = data.tracks?.find((t) => t.id === trackId) as Track | undefined;
          let base = [...(trackFromApi?.lessons ?? track.lessons)].sort((a, b) => a.order - b.order);
          if (pendingAddedLesson && !base.some((l) => l.id === pendingAddedLesson.id)) {
            base = [...base, { ...pendingAddedLesson, order: base.length }];
            setPendingAddedLesson(null);
          }
          setLessons(base);
        })
        .finally(() => setLoadingOrphans(false));
    }
  }, [editing, track.lessons, orphans, pendingAddedLesson]);

  const inTrackIds = new Set(lessons.map((l) => l.id));

  const addLesson = useCallback((type: LessonRef["type"], id: string, title: string) => {
    if (inTrackIds.has(id)) return;
    setLessons((prev) => [...prev, { id, type, title, order: prev.length }]);
  }, [inTrackIds]);

  const removeLesson = useCallback((index: number) => {
    setLessons((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, order: i })));
  }, []);

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setLessons((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((l, i) => ({ ...l, order: i }));
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setLessons((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((l, i) => ({ ...l, order: i }));
    });
  }, []);

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    setDragOverIndex(index);
  };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === toIndex) return;
    setLessons((prev) => {
      const next = [...prev];
      const [removed] = next.splice(draggedIndex, 1);
      next.splice(toIndex, 0, removed);
      return next.map((l, i) => ({ ...l, order: i }));
    });
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = lessons.map((l, i) => ({ ...l, order: i }));
      await updateTrack(trackId, { lessons: payload });
      toast({ title: "Сохранено", description: "Состав трека обновлён." });
      setEditing(false);
      setOrphans(null);
      router.refresh();
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось сохранить",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createBase = "/admin";
  const trackIdQuery = `trackId=${encodeURIComponent(trackId)}`;

  if (!isTeacher) return null;

  if (!editing) {
    return (
      <div className="pt-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="rounded-lg">
          Редактировать состав трека
        </Button>
      </div>
    );
  }

  if (loadingOrphans) {
    return (
      <Card className="mt-4 shadow-sm border-border/80">
        <CardContent className="py-8 text-muted-foreground">
          Загрузка списка уроков…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 shadow-sm border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Редактирование уроков трека</CardTitle>
        <CardDescription className="text-sm">
          Перетаскивайте строки или используйте стрелки для изменения порядка. Сначала создавайте новые уроки, затем при необходимости добавляйте существующие.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* 1. Уроки в треке — порядок, кнопки вверх/вниз, DnD, удалить */}
        <section>
          <h3 className="text-sm font-medium mb-3">Уроки в треке</h3>
          {lessons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 py-8 text-muted-foreground text-sm">
              Пока уроков нет. Создайте новые или добавьте существующие ниже.
            </div>
          ) : (
            <ul className="space-y-1">
              {lessons.map((lesson, index) => {
                const Icon = TYPE_ICONS[lesson.type] ?? ListChecks;
                const isDragOver = dragOverIndex === index;
                return (
                  <li
                    key={`${lesson.type}-${lesson.id}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                      isDragOver ? "border-primary bg-primary/5" : "border-border/80 bg-card"
                    } ${draggedIndex === index ? "opacity-60" : ""}`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing" />
                    <span className="text-xs font-medium text-muted-foreground w-5 tabular-nums">{index + 1}</span>
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate min-w-0">{lesson.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{TYPE_LABELS[lesson.type]}</span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        title="Поднять выше"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => moveDown(index)}
                        disabled={index === lessons.length - 1}
                        title="Опустить ниже"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Link href={getEditUrl(lesson.type, lesson.id)} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Редактировать">
                          <PenLine className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() => removeLesson(index)}
                        title="Удалить из трека"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 2. Создать новый урок — ссылки на создание (лекция, задача, puzzle, опрос) */}
        <section className="rounded-xl border border-border/80 bg-muted/10 p-4">
          <h3 className="text-sm font-medium mb-3">Создать новый урок</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Будет создан новый элемент и добавлен в трек. После создания вы вернётесь сюда.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`${createBase}/lectures/new?${trackIdQuery}`}>
              <Button type="button" variant="outline" size="sm" className="gap-2 rounded-lg">
                <BookOpen className="h-4 w-4" />
                Новая лекция
              </Button>
            </Link>
            <Link href={`${createBase}/tasks/new?${trackIdQuery}`}>
              <Button type="button" variant="outline" size="sm" className="gap-2 rounded-lg">
                <ListChecks className="h-4 w-4" />
                Новая задача
              </Button>
            </Link>
            <Link href={`${createBase}/puzzles/new?${trackIdQuery}`}>
              <Button type="button" variant="outline" size="sm" className="gap-2 rounded-lg">
                <Puzzle className="h-4 w-4" />
                Новый puzzle
              </Button>
            </Link>
            <Link href={`${createBase}/questions/new?${trackIdQuery}`}>
              <Button type="button" variant="outline" size="sm" className="gap-2 rounded-lg">
                <HelpCircle className="h-4 w-4" />
                Новый вопрос
              </Button>
            </Link>
            <Link href={`${createBase}/surveys/new?${trackIdQuery}`}>
              <Button type="button" variant="outline" size="sm" className="gap-2 rounded-lg">
                <ClipboardList className="h-4 w-4" />
                Новый опрос
              </Button>
            </Link>
          </div>
        </section>

        {/* 3. Добавить существующий урок — в конце */}
        {orphans && (
          <section className="rounded-xl border border-border/80 bg-muted/5 p-4">
            <h3 className="text-sm font-medium mb-3">Добавить существующий урок</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Уже созданные лекции, задачи и т.д., которые ещё не входят ни в один трек.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {orphans.orphan_lectures.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Лекции</h4>
                  <ul className="space-y-1">
                    {orphans.orphan_lectures
                      .filter((l) => !inTrackIds.has(l.id))
                      .map((lec) => (
                        <li key={lec.id} className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 rounded-lg justify-start max-w-full min-w-0"
                            onClick={() => addLesson("lecture", lec.id, lec.title)}
                          >
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{lec.title}</span>
                          </Button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {orphans.orphan_tasks.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Задачи</h4>
                  <ul className="space-y-1">
                    {orphans.orphan_tasks
                      .filter((t) => !inTrackIds.has(t.id))
                      .map((task) => (
                        <li key={task.id} className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 rounded-lg justify-start max-w-full min-w-0"
                            onClick={() => addLesson("task", task.id, task.title)}
                          >
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{task.title}</span>
                          </Button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {orphans.orphan_puzzles.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Puzzle</h4>
                  <ul className="space-y-1">
                    {orphans.orphan_puzzles
                      .filter((p) => !inTrackIds.has(p.id))
                      .map((p) => (
                        <li key={p.id} className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 rounded-lg justify-start max-w-full min-w-0"
                            onClick={() => addLesson("puzzle", p.id, p.title)}
                          >
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{p.title}</span>
                          </Button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {orphans.orphan_questions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Вопросы</h4>
                  <ul className="space-y-1">
                    {orphans.orphan_questions
                      .filter((q) => !inTrackIds.has(q.id))
                      .map((q) => (
                        <li key={q.id} className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 rounded-lg justify-start max-w-full min-w-0"
                            onClick={() => addLesson("question", q.id, q.title)}
                          >
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{q.title}</span>
                          </Button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {orphans.orphan_surveys.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Опросы</h4>
                  <ul className="space-y-1">
                    {orphans.orphan_surveys
                      .filter((s) => !inTrackIds.has(s.id))
                      .map((s) => (
                        <li key={s.id} className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5 rounded-lg justify-start max-w-full min-w-0"
                            onClick={() => addLesson("survey", s.id, s.title)}
                          >
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{s.title}</span>
                          </Button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
            {[
              orphans.orphan_lectures,
              orphans.orphan_tasks,
              orphans.orphan_puzzles,
              orphans.orphan_questions,
              orphans.orphan_surveys,
            ].every((arr) => arr.filter((x) => !inTrackIds.has(x.id)).length === 0) && (
              <p className="text-sm text-muted-foreground mt-2">Нет доступных уроков для добавления.</p>
            )}
          </section>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="rounded-lg min-w-[120px]">
            {saving ? "Сохранение…" : "Сохранить"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(false);
              setOrphans(null);
            }}
            disabled={saving}
            className="rounded-lg"
          >
            Отмена
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getEditUrl(type: LessonRef["type"], id: string): string {
  switch (type) {
    case "lecture":
      return `/lectures/${id}/edit`;
    case "task":
      return `/tasks/${id}/edit`;
    case "puzzle":
      return `/puzzles/${id}/edit`;
    case "question":
      return `/questions/${id}/edit`;
    case "survey":
      return `/surveys/${id}`;
    default:
      return "/main";
  }
}

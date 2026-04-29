"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Clock3,
  ExternalLink,
  FileCode2,
  FileText,
  Filter,
  HelpCircle,
  Layers3,
  ListChecks,
  MessageCircle,
  Puzzle,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CodeEditor } from "@/components/editor/code-editor";
import { AvailabilityOverdue, formatLateSeconds } from "@/components/availability-countdown";
import { getStoredRole, getStoredToken } from "@/lib/api/auth";
import {
  fetchStandaloneProgress,
  fetchStudentTaskSubmission,
  type StandaloneAssignment,
  type StandaloneStudentProgress,
} from "@/lib/api/teacher";
import { cn } from "@/components/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  lecture: "Лекция",
  task: "Задание",
  puzzle: "Пазл",
  question: "Вопрос",
  survey: "Опрос",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  lecture: BookOpen,
  task: ListChecks,
  puzzle: Puzzle,
  question: HelpCircle,
  survey: MessageCircle,
};

function assignmentHref(item: StandaloneAssignment) {
  switch (item.type) {
    case "lecture":
      return `/lectures/${item.id}`;
    case "task":
      return `/tasks/${item.id}`;
    case "puzzle":
      return `/puzzles/${item.id}`;
    case "question":
      return `/questions/${item.id}`;
    case "survey":
      return `/surveys/${item.id}`;
    default:
      return "/main";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Без срока";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Без срока";
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function completionLabel(student: StandaloneStudentProgress) {
  if (student.status === "completed") return "Выполнено";
  if (student.status === "completed_late") return "Выполнено с опозданием";
  if (student.status === "started") return "В процессе";
  return "Не начато";
}

function completionTone(student: StandaloneStudentProgress) {
  if (student.status === "completed") return "bg-emerald-500/12 text-emerald-700 border-emerald-500/20";
  if (student.status === "completed_late") return "bg-amber-500/12 text-amber-700 border-amber-500/20";
  if (student.status === "started") return "bg-sky-500/12 text-sky-700 border-sky-500/20";
  return "bg-muted text-muted-foreground border-border";
}

function buildStudentsView(assignments: StandaloneAssignment[], groupFilter: string) {
  const map = new Map<
    string,
    {
      user_id: string;
      full_name: string;
      group_id: string;
      group_title: string;
      assignments: { assignment: StandaloneAssignment; student: StandaloneStudentProgress }[];
    }
  >();

  for (const assignment of assignments) {
    for (const student of assignment.students) {
      if (groupFilter && student.group_id !== groupFilter) continue;
      const existing = map.get(student.user_id) ?? {
        user_id: student.user_id,
        full_name: student.full_name,
        group_id: student.group_id,
        group_title: student.group_title,
        assignments: [],
      };
      existing.assignments.push({ assignment, student });
      map.set(student.user_id, existing);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export default function AssignmentsDetailPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"students" | "assignments">("students");
  const [groupFilter, setGroupFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [data, setData] = useState<{ assignments: StandaloneAssignment[]; groups: { id: string; title: string }[] } | null>(null);
  const [viewer, setViewer] = useState<{
    assignment: StandaloneAssignment;
    student: StandaloneStudentProgress;
    taskCode: string | null;
    loading: boolean;
  } | null>(null);

  useEffect(() => {
    const role = getStoredRole();
    if (role !== "teacher" && role !== "superuser") {
      router.replace("/main");
      return;
    }

    fetchStandaloneProgress()
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Не удалось загрузить детализацию заданий"))
      .finally(() => setLoading(false));
  }, [router]);

  const assignments = useMemo(() => {
    const source = data?.assignments ?? [];
    return source.filter((assignment) => {
      if (typeFilter && assignment.type !== typeFilter) return false;
      if (groupFilter && !assignment.students.some((student) => student.group_id === groupFilter)) return false;
      return true;
    });
  }, [data?.assignments, groupFilter, typeFilter]);

  const studentsView = useMemo(() => buildStudentsView(assignments, groupFilter), [assignments, groupFilter]);

  const summary = useMemo(() => {
    const students = assignments.flatMap((assignment) => assignment.students);
    const completed = students.filter((student) => student.status === "completed").length;
    const completedLate = students.filter((student) => student.status === "completed_late").length;
    const started = students.filter((student) => student.status === "started").length;
    return {
      assignments: assignments.length,
      completed,
      completedLate,
      started,
    };
  }, [assignments]);

  async function openViewer(assignment: StandaloneAssignment, student: StandaloneStudentProgress) {
    if (student.status !== "completed" && student.status !== "completed_late") return;

    setViewer({ assignment, student, taskCode: null, loading: assignment.type === "task" });

    if (assignment.type === "task") {
      const submission = await fetchStudentTaskSubmission(assignment.id, student.user_id, getStoredToken()).catch(() => null);
      setViewer({ assignment, student, taskCode: submission?.code ?? null, loading: false });
    }
  }

  if (loading) {
    return <PageSkeleton cards={4} />;
  }

  if (error) {
    return (
      <div className="content-block space-y-6">
        <PageHeader
          title="Детализация заданий"
          description="Не удалось загрузить monitoring-данные."
          breadcrumbs={[{ label: "Главная", href: "/main" }, { label: "Детализация заданий" }]}
        />
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="content-block space-y-6">
      <PageHeader
        title="Детализация заданий"
        description="Monitoring-экран для одиночных и временных материалов: смотрим активность по ученикам, группам, типам и срокам."
        breadcrumbs={[{ label: "Главная", href: "/main" }, { label: "Детализация заданий" }]}
      />

      <section className="hero-surface rounded-[2rem] border border-border/60 px-6 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr] lg:items-end">
          <div className="space-y-4">
            <div className="kavnt-badge w-fit">Standalone monitoring</div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Быстро считываем completion, overdue и фактические ответы учеников
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Экран специально собран как рабочая аналитическая поверхность: сначала фильтр, потом сигнал, потом действие.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Материалы</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{summary.assignments}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Выполнено</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{summary.completed}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">С опозданием</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{summary.completedLate}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">В процессе</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{summary.started}</p>
            </div>
          </div>
        </div>
      </section>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Filter className="h-4 w-4 text-primary" />
            Фильтры обзора
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
            <select
              className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm"
              value={groupFilter}
              onChange={(event) => setGroupFilter(event.target.value)}
            >
              <option value="">Все группы</option>
              {(data?.groups ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.title}
                </option>
              ))}
            </select>
            <select
              className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="">Все типы</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs value={mode} onValueChange={(value) => setMode(value as "students" | "assignments")} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            По ученикам
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <Layers3 className="h-4 w-4" />
            По материалам
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          {studentsView.length > 0 ? (
            studentsView.map((item) => {
              const done = item.assignments.filter(
                ({ student }) => student.status === "completed" || student.status === "completed_late"
              );
              return (
                <Card key={item.user_id}>
                  <CardHeader>
                    <CardTitle>{item.full_name}</CardTitle>
                    <CardDescription>
                      {item.group_title} · {done.length} завершенных материалов
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {done.length > 0 ? (
                      done
                        .sort((a, b) => (b.student.completed_at ?? "").localeCompare(a.student.completed_at ?? ""))
                        .map(({ assignment, student }) => {
                          const Icon = TYPE_ICONS[assignment.type] ?? FileText;
                          return (
                            <div key={`${assignment.id}-${student.user_id}`} className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-background text-primary">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">{assignment.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {TYPE_LABELS[assignment.type]} · {formatDate(student.completed_at)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", completionTone(student))}>
                                    {completionLabel(student)}
                                  </span>
                                  <Link href={assignmentHref(assignment)} target="_blank" rel="noreferrer">
                                    <Button size="sm" variant="outline" className="gap-2">
                                      <ExternalLink className="h-4 w-4" />
                                      Открыть
                                    </Button>
                                  </Link>
                                  {(assignment.type === "task" || assignment.type === "survey") && (
                                    <Button size="sm" onClick={() => void openViewer(assignment, student)}>
                                      Смотреть ответ
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {student.status === "completed_late" && student.late_by_seconds ? (
                                <p className="mt-3 text-sm text-amber-700">
                                  Опоздание: {formatLateSeconds(student.late_by_seconds)}
                                </p>
                              ) : null}
                            </div>
                          );
                        })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                        У ученика пока нет завершенных материалов по текущему фильтру.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <EmptyState
              icon={Users}
              title="Нет данных по ученикам"
              description="Попробуйте снять фильтры или дождитесь первых завершений."
            />
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          {assignments.length > 0 ? (
            assignments.map((assignment) => {
              const Icon = TYPE_ICONS[assignment.type] ?? FileText;
              const relevantStudents = groupFilter
                ? assignment.students.filter((student) => student.group_id === groupFilter)
                : assignment.students;
              const completed = relevantStudents.filter((student) => student.status === "completed").length;
              const completedLate = relevantStudents.filter((student) => student.status === "completed_late").length;
              const started = relevantStudents.filter((student) => student.status === "started").length;
              const overdue = relevantStudents.some((student) => student.status === "completed_late");

              return (
                <Card key={assignment.id}>
                  <CardContent className="p-0">
                    <div className="border-b border-border/60 px-5 py-5 sm:px-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="kavnt-badge">{TYPE_LABELS[assignment.type]}</span>
                            {overdue ? (
                              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-800">
                                Есть late-completions
                              </span>
                            ) : null}
                          </div>
                          <div>
                            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">{assignment.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {assignment.available_until ? (
                                <>
                                  Дедлайн: {formatDate(assignment.available_until)}
                                </>
                              ) : (
                                "Постоянный материал без срока"
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={assignmentHref(assignment)} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="gap-2">
                              <ExternalLink className="h-4 w-4" />
                              Открыть материал
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-0 lg:grid-cols-[0.8fr,1.2fr]">
                      <div className="border-b border-border/60 p-5 lg:border-b-0 lg:border-r lg:p-6">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Выполнено</p>
                            <p className="mt-3 text-2xl font-semibold">{completed}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Late</p>
                            <p className="mt-3 text-2xl font-semibold">{completedLate}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 sm:col-span-2">
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">В процессе</p>
                            <p className="mt-3 text-2xl font-semibold">{started}</p>
                          </div>
                        </div>
                        {assignment.available_until ? (
                          <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <Clock3 className="h-4 w-4 text-primary" />
                              Статус срока
                            </div>
                            <div className="mt-3">
                              <AvailabilityOverdue availableUntil={assignment.available_until} />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="p-5 lg:p-6">
                        <div className="grid gap-3">
                          {relevantStudents.length > 0 ? (
                            relevantStudents.map((student) => (
                              <div key={`${assignment.id}-${student.user_id}`} className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                  <div>
                                    <p className="font-medium text-foreground">{student.full_name}</p>
                                    <p className="text-sm text-muted-foreground">{student.group_title}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", completionTone(student))}>
                                      {completionLabel(student)}
                                    </span>
                                    {(assignment.type === "task" || assignment.type === "survey") &&
                                    (student.status === "completed" || student.status === "completed_late") ? (
                                      <Button size="sm" onClick={() => void openViewer(assignment, student)}>
                                        Смотреть ответ
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                                {student.completed_at ? (
                                  <p className="mt-3 text-sm text-muted-foreground">
                                    Завершено: {formatDate(student.completed_at)}
                                  </p>
                                ) : null}
                                {student.status === "completed_late" && student.late_by_seconds ? (
                                  <p className="mt-2 text-sm text-amber-700">
                                    Опоздание: {formatLateSeconds(student.late_by_seconds)}
                                  </p>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                              По текущему фильтру не найдено ни одного ученика.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <EmptyState
              icon={Layers3}
              title="Standalone-материалы не найдены"
              description="Снимите фильтры или проверьте, назначены ли материалы группам."
            />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(viewer)} onOpenChange={(open) => !open && setViewer(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{viewer ? `${viewer.student.full_name} · ${viewer.assignment.title}` : "Просмотр ответа"}</DialogTitle>
            <DialogDescription>
              {viewer ? `${TYPE_LABELS[viewer.assignment.type]} · ${viewer.student.group_title}` : ""}
            </DialogDescription>
          </DialogHeader>

          {viewer?.assignment.type === "survey" ? (
            <div className="rounded-3xl border border-border/70 bg-muted/15 p-5 text-sm leading-7 text-foreground">
              {viewer.student.response_text || "Ответ не был сохранен."}
            </div>
          ) : viewer?.assignment.type === "task" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <FileCode2 className="h-4 w-4 text-primary" />
                  Кодовое решение ученика
                </div>
              </div>
              {viewer.loading ? (
                <PageSkeleton cards={1} />
              ) : viewer.taskCode ? (
                <CodeEditor
                  value={viewer.taskCode}
                  onChange={() => {}}
                  language="python"
                  readOnly
                />
              ) : (
                <EmptyState
                  icon={FileCode2}
                  title="Код не найден"
                  description="Сервер не вернул сохраненную submission-версию."
                />
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewer(null)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { fetchStandaloneProgress, fetchStudentTaskSubmission, type StandaloneAssignment, type StandaloneStudentProgress } from "@/lib/api/teacher";
import { getStoredRole, getStoredToken } from "@/lib/api/auth";
import { AvailabilityOverdue, formatLateSeconds } from "@/components/availability-countdown";
import { parseDateTime } from "@/lib/utils/datetime";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, ArrowLeft, BookOpen, ListChecks, Puzzle, HelpCircle, MessageCircle, Users, FileText, ExternalLink, ChevronDown, ChevronRight, UserCircle, CheckCircle2, Clock } from "lucide-react";
import { CodeEditor } from "@/components/editor/code-editor";
import { cn } from "@/components/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  lecture: "Лекция",
  task: "Задача",
  puzzle: "Пазл",
  question: "Вопрос",
  survey: "Опрос",
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  lecture: BookOpen,
  task: ListChecks,
  puzzle: Puzzle,
  question: HelpCircle,
  survey: MessageCircle,
};

function formatCompletedAt(iso: string | null | undefined): string {
  const d = parseDateTime(iso ?? null);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getHref(a: { type: string; id: string }): string {
  switch (a.type) {
    case "lecture": return `/lectures/${a.id}`;
    case "task": return `/tasks/${a.id}`;
    case "puzzle": return `/puzzles/${a.id}`;
    case "question": return `/questions/${a.id}`;
    case "survey": return `/surveys/${a.id}`;
    default: return "/main";
  }
}

/** Ученик с его заданиями (для режима «по ученикам») */
interface StudentWithAssignments {
  user_id: string;
  full_name: string;
  group_id: string;
  group_title: string;
  assignments: { assignment: StandaloneAssignment; student: StandaloneStudentProgress }[];
}

function buildStudentsView(assignments: StandaloneAssignment[], groupFilter: string): StudentWithAssignments[] {
  const byStudent = new Map<string, StudentWithAssignments>();
  for (const a of assignments) {
    for (const s of a.students) {
      if (groupFilter && s.group_id !== groupFilter) continue;
      let rec = byStudent.get(s.user_id);
      if (!rec) {
        rec = { user_id: s.user_id, full_name: s.full_name, group_id: s.group_id, group_title: s.group_title, assignments: [] };
        byStudent.set(s.user_id, rec);
      }
      rec.assignments.push({ assignment: a, student: s });
    }
  }
  return Array.from(byStudent.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
}

export default function AssignmentsDetailPage() {
  const router = useRouter();
  const [data, setData] = useState<{ assignments: StandaloneAssignment[]; groups: { id: string; title: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"students" | "assignments">("students");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [selectedGroupByAssignment, setSelectedGroupByAssignment] = useState<Record<string, string>>({});
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [solutionViewer, setSolutionViewer] = useState<{
    type: string;
    assignmentId: string;
    assignmentTitle: string;
    student: StandaloneStudentProgress;
  } | null>(null);
  const [taskCode, setTaskCode] = useState<string | null>(null);
  const [taskCodeLoading, setTaskCodeLoading] = useState(false);

  useEffect(() => {
    const role = getStoredRole();
    if (role !== "teacher" && role !== "superuser") {
      router.replace("/main");
      return;
    }
    fetchStandaloneProgress()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!solutionViewer || solutionViewer.type !== "task") return;
    setTaskCodeLoading(true);
    fetchStudentTaskSubmission(solutionViewer.assignmentId, solutionViewer.student.user_id, getStoredToken())
      .then((res) => {
        if (res) setTaskCode(res.code);
        else setTaskCode(null);
      })
      .finally(() => setTaskCodeLoading(false));
  }, [solutionViewer?.assignmentId, solutionViewer?.student?.user_id, solutionViewer?.type]);

  useEffect(() => {
    if (!solutionViewer) setTaskCode(null);
  }, [solutionViewer]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Загрузка детализации…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/main">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Детализация заданий</h1>
          </div>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/main")}>
              На главную
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignments = data?.assignments ?? [];
  const groups = data?.groups ?? [];

  const { permanent, temporary, overdue } = (() => {
    const perm: StandaloneAssignment[] = [];
    const temp: StandaloneAssignment[] = [];
    const over: StandaloneAssignment[] = [];
    const now = Date.now();
    for (const a of assignments) {
      const untilTs = parseDateTime(a.available_until ?? null)?.getTime() ?? null;
      if (untilTs == null) perm.push(a);
      else if (untilTs < now) over.push(a);
      else temp.push(a);
    }
    return { permanent: perm, temporary: temp, overdue: over };
  })();

  const studentsView = buildStudentsView(assignments, groupFilter);

  const openSolution = (a: StandaloneAssignment, s: StandaloneStudentProgress) => {
    if (s.status !== "completed" && s.status !== "completed_late") return;
    setSolutionViewer({
      type: a.type,
      assignmentId: a.id,
      assignmentTitle: a.title,
      student: s,
    });
  };

  return (
    <div className="space-y-6 w-full max-w-5xl">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/main">
            <Button variant="ghost" size="icon" className="shrink-0 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Детализация заданий
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Активность учеников и выполнение одиночных заданий
            </p>
          </div>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "students" | "assignments")} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-11 p-1 bg-muted/50">
          <TabsTrigger value="students" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            По ученикам
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4" />
            По заданиям
          </TabsTrigger>
        </TabsList>

        {/* ========== РЕЖИМ: ПО УЧЕНИКАМ ========== */}
        <TabsContent value="students" className="mt-6 space-y-4">
          <Card className="border-0 bg-muted/30">
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="group-filter" className="text-sm font-medium shrink-0">Фильтр по группе</Label>
                  <select
                    id="group-filter"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="flex h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm w-full sm:w-[220px] focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Все группы</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
                <p className="text-sm text-muted-foreground">
                  {groupFilter ? `Показаны ученики выбранной группы` : "Показаны ученики из всех групп"}
                </p>
              </div>
            </CardContent>
          </Card>

          {studentsView.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16">
                <UserCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">Нет учеников</p>
                <p className="text-sm text-muted-foreground/80 mt-1">
                  {groupFilter ? "В выбранной группе нет учеников с заданиями" : "Нет одиночных заданий для ваших групп"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {studentsView.map((swa) => {
                const completedCount = swa.assignments.filter(({ student }) => student.status === "completed" || student.status === "completed_late").length;
                return (
                  <Card key={swa.user_id} className="overflow-hidden transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-lg">
                          {swa.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg">{swa.full_name}</CardTitle>
                          <CardDescription className="mt-0.5 flex items-center gap-1">
                            {swa.group_title || "—"}
                            {completedCount > 0 && (
                              <>
                                <span className="text-muted-foreground/50">·</span>
                                <span className="text-green-600 dark:text-green-400 font-medium">{completedCount} выполнено</span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {completedCount === 0 ? (
                        <div className="py-6 rounded-lg bg-muted/20">
                          <p className="text-sm text-muted-foreground">Пока нет выполненных заданий</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {swa.assignments
                            .filter(({ student }) => student.status === "completed" || student.status === "completed_late")
                            .sort((x, y) => (y.student.completed_at ?? "").localeCompare(x.student.completed_at ?? ""))
                            .map(({ assignment, student }) => {
                              const Icon = TYPE_ICON[assignment.type] ?? ListChecks;
                              const isOnTime = student.status === "completed";
                              return (
                                <div
                                  key={`${assignment.type}-${assignment.id}`}
                                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/20 transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                      <Icon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{assignment.title}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {TYPE_LABEL[assignment.type]} · {formatCompletedAt(student.completed_at)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                                        isOnTime
                                          ? "bg-green-500/15 text-green-700 dark:text-green-400"
                                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                      )}
                                    >
                                      {isOnTime ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                      {isOnTime ? "В срок" : `После срока (${formatLateSeconds(student.late_by_seconds ?? 0)})`}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Link href={getHref(assignment)} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm" className="h-8">
                                          <ExternalLink className="h-3.5 w-3 mr-1" />
                                          Открыть
                                        </Button>
                                      </Link>
                                      {(assignment.type === "task" || assignment.type === "survey") && (
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          className="h-8"
                                          onClick={() => openSolution(assignment, student)}
                                        >
                                          Решение
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ========== РЕЖИМ: ПО ЗАДАНИЯМ ========== */}
        <TabsContent value="assignments" className="mt-6">
          <Tabs defaultValue={permanent.length > 0 ? "permanent" : temporary.length > 0 ? "temporary" : "overdue"} className="w-full">
            <TabsList className="grid w-full max-w-lg grid-cols-3 h-11 p-1 bg-muted/50 mb-6">
              <TabsTrigger value="permanent" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Постоянные ({permanent.length})
              </TabsTrigger>
              <TabsTrigger value="temporary" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Временные ({temporary.length})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Просроченные ({overdue.length})
              </TabsTrigger>
            </TabsList>

            {(["permanent", "temporary", "overdue"] as const).map((tab) => {
              const list = tab === "permanent" ? permanent : tab === "temporary" ? temporary : overdue;
              const tabLabel = tab === "permanent" ? "постоянных" : tab === "temporary" ? "временных" : "просроченных";
              return (
                <TabsContent key={tab} value={tab} className="mt-0 space-y-4">
                  {list.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-16">
                        <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground font-medium">Нет {tabLabel} заданий</p>
                      </CardContent>
                    </Card>
                  ) : (
                    list.map((a) => {
                      const assignmentKey = `${a.type}-${a.id}`;
                      const groupsInAssignment = Array.from(new Map(a.students.filter((s) => s.group_id && s.group_title).map((s) => [s.group_id, s.group_title])).entries()).map(([id, title]) => ({ id, title }));
                      const hasMultipleGroups = groupsInAssignment.length > 1;
                      const selectedGroupId = selectedGroupByAssignment[assignmentKey] ?? "";
                      const studentsFiltered = hasMultipleGroups && selectedGroupId
                        ? a.students.filter((s) => s.group_id === selectedGroupId)
                        : a.students;
                      const completions = studentsFiltered.filter((s) => s.status === "completed" || s.status === "completed_late");
                      const isExpanded = expandedAssignmentId === assignmentKey;
                      const Icon = TYPE_ICON[a.type] ?? ListChecks;
                      const untilTs = parseDateTime(a.available_until ?? null)?.getTime() ?? null;
                      const isExpired = untilTs != null && untilTs < Date.now();

                      return (
                        <Card key={assignmentKey} className="overflow-hidden transition-shadow hover:shadow-md">
                          <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div className="flex items-start gap-4 min-w-0">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                  <Icon className="h-6 w-6 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <CardTitle className="text-lg">{a.title}</CardTitle>
                                  <CardDescription className="mt-1 flex items-center gap-2">
                                    <span>{TYPE_LABEL[a.type] ?? a.type}</span>
                                    <span className="text-muted-foreground/50">·</span>
                                    <span className={completions.length > 0 ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                                      {completions.length} выполнили
                                    </span>
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {hasMultipleGroups && (
                                  <select
                                    value={selectedGroupId}
                                    onChange={(e) =>
                                      setSelectedGroupByAssignment((prev) => ({
                                        ...prev,
                                        [assignmentKey]: e.target.value,
                                      }))
                                    }
                                    className="flex h-9 rounded-lg border border-input bg-background px-3 py-2 text-sm min-w-[140px] focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                  >
                                    <option value="">Выберите группу</option>
                                    {groupsInAssignment.map((g) => (
                                      <option key={g.id} value={g.id}>{g.title}</option>
                                    ))}
                                  </select>
                                )}
                                <Link href={getHref(a)} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm" className="h-9">
                                    <ExternalLink className="h-3.5 w-3 mr-1.5" />
                                    Открыть
                                  </Button>
                                </Link>
                                {!isExpired && (!hasMultipleGroups || selectedGroupId) && (
                                  <Button
                                    variant={isExpanded ? "secondary" : "default"}
                                    size="sm"
                                    className="h-9"
                                    onClick={() => setExpandedAssignmentId(isExpanded ? null : assignmentKey)}
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronDown className="h-3.5 w-3 mr-1.5" />
                                        Свернуть
                                      </>
                                    ) : (
                                      <>
                                        <ChevronRight className="h-3.5 w-3 mr-1.5" />
                                        Кто выполнил
                                      </>
                                    )}
                                  </Button>
                                )}
                                {isExpired && <AvailabilityOverdue availableUntil={a.available_until ?? undefined} className="shrink-0" />}
                              </div>
                            </div>
                          </CardHeader>
                          {isExpanded && (
                            <>
                              <Separator />
                              <CardContent className="pt-5">
                                <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  Выполнили задание
                                </h4>
                                {completions.length === 0 ? (
                                  <div className="py-10 rounded-lg bg-muted/20">
                                    <p className="text-sm text-muted-foreground">Пока никто не выполнил это задание</p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {completions
                                      .sort((p, q) => (q.completed_at ?? "").localeCompare(p.completed_at ?? ""))
                                      .map((s) => {
                                        const isOnTime = s.status === "completed";
                                        return (
                                          <div
                                            key={s.user_id}
                                            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-muted/20 hover:bg-muted/30 transition-colors"
                                          >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background border font-medium">
                                                {s.full_name.charAt(0).toUpperCase()}
                                              </div>
                                              <div>
                                                <p className="font-medium">{s.full_name}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{formatCompletedAt(s.completed_at)}</p>
                                              </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                              <span
                                                className={cn(
                                                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                  isOnTime
                                                    ? "bg-green-500/15 text-green-700 dark:text-green-400"
                                                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                                )}
                                              >
                                                {isOnTime ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                                {isOnTime ? "В срок" : `После срока (${formatLateSeconds(s.late_by_seconds ?? 0)})`}
                                              </span>
                                              <div className="flex items-center gap-1">
                                                <Link href={getHref(a)} target="_blank" rel="noopener noreferrer">
                                                  <Button variant="outline" size="sm" className="h-8">
                                                    <ExternalLink className="h-3.5 w-3 mr-1" />
                                                    Задание
                                                  </Button>
                                                </Link>
                                                {(a.type === "task" || a.type === "survey") && (
                                                  <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-8"
                                                    onClick={() => openSolution(a, s)}
                                                  >
                                                    Решение
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </CardContent>
                            </>
                          )}
                        </Card>
                      );
                    })
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </TabsContent>
      </Tabs>

      {groups.length > 0 && (
        <div className="pt-2">
          <Separator className="mb-3" />
          <p className="text-xs text-muted-foreground">Группы: {groups.map((g) => g.title).join(", ")}</p>
        </div>
      )}

      {/* Диалог просмотра решения */}
      <Dialog open={!!solutionViewer} onOpenChange={(open) => !open && setSolutionViewer(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col gap-0">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg flex items-center gap-2">
              <span className="truncate">{solutionViewer?.assignmentTitle}</span>
              <span className="text-muted-foreground font-normal">·</span>
              <span className="font-medium text-primary">{solutionViewer?.student.full_name}</span>
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {solutionViewer?.type === "task" && "Код решения ученика"}
              {solutionViewer?.type === "survey" && "Ответ на опрос"}
            </p>
          </DialogHeader>
          <Separator />
          <div className="flex-1 overflow-y-auto py-5 space-y-4">
            {solutionViewer?.type === "task" && (
              <>
                {taskCodeLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p className="text-sm text-muted-foreground">Загрузка кода…</p>
                    </div>
                  </div>
                ) : (
                  <CodeEditor value={taskCode ?? ""} onChange={() => {}} readOnly language="python" className="min-h-[280px]" />
                )}
                <div className="flex justify-end">
                  <Link href={getHref({ type: "task", id: solutionViewer?.assignmentId ?? "" })} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Открыть задание
                    </Button>
                  </Link>
                </div>
              </>
            )}
            {solutionViewer?.type === "survey" && (
              <>
                <div className="rounded-lg border bg-muted/30 p-5">
                  <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{solutionViewer?.student.response_text || "—"}</pre>
                </div>
                <div className="flex justify-end">
                  <Link href={getHref({ type: "survey", id: solutionViewer?.assignmentId ?? "" })} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Открыть опрос
                    </Button>
                  </Link>
                </div>
              </>
            )}
            {(solutionViewer?.type === "puzzle" || solutionViewer?.type === "question") && (
              <div className="py-12">
                <p className="text-muted-foreground">Решение не сохраняется. Перейдите к заданию для просмотра.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

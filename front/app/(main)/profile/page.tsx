"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  Flame,
  KeyRound,
  Link2,
  LogOut,
  Plus,
  QrCode,
  Sparkles,
  Trophy,
  User,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { QrCodeCard } from "@/components/qr-code-card";
import { ProgressDonut, AreaChartCard, BarChartCard, StatCard } from "@/components/charts";
import { formatLateSeconds } from "@/components/availability-countdown";
import { cn } from "@/components/lib/utils";
import {
  clearStoredRole,
  clearStoredToken,
  clearStoredUser,
  getStoredRole,
  getStoredToken,
  getStoredUser,
} from "@/lib/api/auth";
import { fetchProfile, type ProfileData } from "@/lib/api/profile";
import {
  fetchStudentTrackProgress,
  fetchTeacherGroupsProgress,
  updateGroupLinks,
  type GroupLink,
  type GroupWithStudents,
  type StudentInGroup,
  type StudentTrackProgressResponse,
} from "@/lib/api/teacher";
import { fetchTeacherAnalytics, type TeacherAnalytics } from "@/lib/api/analytics";
import { createStudentInGroup, resetStudentPassword } from "@/lib/api/users";
import { useToast } from "@/components/ui/use-toast";

const LESSON_TYPE_LABELS: Record<string, string> = {
  lecture: "Лекция",
  task: "Задание",
  puzzle: "Пазл",
  question: "Вопрос",
  survey: "Опрос",
  layout: "Верстка",
};

const ROLE_LABELS: Record<string, string> = {
  student: "Студент",
  teacher: "Преподаватель",
  superuser: "Администратор",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Без даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Без даты";
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function getDisplayName(user: {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  username: string;
}) {
  return user.full_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
}

function parseLinksDraft(draft: string): GroupLink[] {
  return draft
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((part) => part.trim());
      return { label: label || "Ссылка", url: url || "" };
    })
    .filter((item) => item.url);
}

function statusBadge(status: string) {
  if (status === "completed") return "bg-emerald-500/12 text-emerald-700 border-emerald-500/20";
  if (status === "completed_late") return "bg-amber-500/12 text-amber-700 border-amber-500/20";
  if (status === "started") return "bg-sky-500/12 text-sky-700 border-sky-500/20";
  return "bg-muted text-muted-foreground border-border";
}

function statusLabel(status: string) {
  if (status === "completed") return "Выполнено";
  if (status === "completed_late") return "Выполнено с опозданием";
  if (status === "started") return "В процессе";
  return "Не начато";
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [teacherGroups, setTeacherGroups] = useState<GroupWithStudents[]>([]);
  const [teacherAnalytics, setTeacherAnalytics] = useState<TeacherAnalytics | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});
  const [trackDetail, setTrackDetail] = useState<{
    open: boolean;
    loading: boolean;
    studentName: string;
    trackTitle: string;
    data: StudentTrackProgressResponse | null;
  }>({ open: false, loading: false, studentName: "", trackTitle: "", data: null });
  const [linksEditor, setLinksEditor] = useState<{
    groupId: string;
    groupTitle: string;
    childChat: string;
    parentChat: string;
    customLinks: string;
  } | null>(null);
  const [studentCreator, setStudentCreator] = useState<{
    groupId: string;
    groupTitle: string;
    username: string;
    first_name: string;
    last_name: string;
    password: string;
  } | null>(null);
  const [passwordReset, setPasswordReset] = useState<{ username: string; password: string } | null>(null);
  const [savingLinks, setSavingLinks] = useState(false);
  const [creatingStudent, setCreatingStudent] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
    setRole(getStoredRole());
  }, []);

  useEffect(() => {
    if (!mounted || !getStoredToken()) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (role === "student") {
          const nextProfile = await fetchProfile();
          if (!cancelled) setProfile(nextProfile);
        }
        if (role === "teacher" || role === "superuser") {
          const [groupsResult, analyticsResult] = await Promise.all([
            fetchTeacherGroupsProgress(),
            fetchTeacherAnalytics(),
          ]);
          if (!cancelled) {
            setTeacherGroups(groupsResult.groups ?? []);
            setTeacherAnalytics(analyticsResult);
          }
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Не удалось загрузить кабинет",
            description: error instanceof Error ? error.message : "Попробуйте обновить страницу.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mounted, role, toast]);

  const displayName = useMemo(() => {
    if (!user) return "";
    return getDisplayName(user);
  }, [user]);

  const studentSummary = useMemo(() => {
    const progress = profile?.progress ?? [];
    const activity = profile?.activity ?? [];
    return {
      activeTracks: progress.length,
      avgProgress: progress.length
        ? Math.round(progress.reduce((sum, item) => sum + item.percent, 0) / progress.length)
        : 0,
      completedCount: activity.filter((item) => item.status === "completed").length,
      lateCount: activity.filter((item) => item.status === "completed_late").length,
    };
  }, [profile]);

  const teacherSummary = useMemo(() => {
    const students = teacherGroups.flatMap((group) => group.students);
    const progressItems = students.flatMap((student) => student.progress);
    const totalTracks = progressItems.length;
    const avgProgress = totalTracks
      ? Math.round(progressItems.reduce((sum, item) => sum + item.percent, 0) / totalTracks)
      : 0;
    return {
      groups: teacherGroups.length,
      students: students.length,
      totalTracks,
      avgProgress,
    };
  }, [teacherGroups]);

  function handleLogout() {
    clearStoredToken();
    clearStoredRole();
    clearStoredUser();
    router.push("/login");
    router.refresh();
  }

  async function openTrackDetail(student: StudentInGroup, trackId: string, trackTitle: string) {
    setTrackDetail({
      open: true,
      loading: true,
      studentName: student.full_name,
      trackTitle,
      data: null,
    });

    const data = await fetchStudentTrackProgress(student.id, trackId).catch(() => null);
    setTrackDetail({
      open: true,
      loading: false,
      studentName: student.full_name,
      trackTitle,
      data,
    });
  }

  async function handleSaveLinks() {
    if (!linksEditor) return;
    setSavingLinks(true);
    try {
      const payload = {
        child_chat_url: linksEditor.childChat.trim(),
        parent_chat_url: linksEditor.parentChat.trim(),
        links: parseLinksDraft(linksEditor.customLinks),
      };
      const updated = await updateGroupLinks(linksEditor.groupId, payload);
      if (!updated) throw new Error("Сервер не принял изменения.");

      setTeacherGroups((prev) =>
        prev.map((group) =>
          group.id === linksEditor.groupId
            ? {
                ...group,
                child_chat_url: updated.child_chat_url,
                parent_chat_url: updated.parent_chat_url,
                links: updated.links,
              }
            : group
        )
      );
      setLinksEditor(null);
      toast({ title: "Ссылки обновлены", description: "Новые QR и материалы уже доступны группе." });
    } catch (error) {
      toast({
        title: "Не удалось сохранить ссылки",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setSavingLinks(false);
    }
  }

  async function handleCreateStudent() {
    if (!studentCreator) return;
    if (
      !studentCreator.username.trim() ||
      !studentCreator.first_name.trim() ||
      !studentCreator.last_name.trim() ||
      studentCreator.password.length < 6
    ) {
      toast({
        title: "Проверьте данные",
        description: "Нужны логин, имя, фамилия и пароль не короче 6 символов.",
        variant: "destructive",
      });
      return;
    }

    setCreatingStudent(true);
    try {
      const created = await createStudentInGroup(studentCreator.groupId, {
        username: studentCreator.username,
        first_name: studentCreator.first_name,
        last_name: studentCreator.last_name,
        password: studentCreator.password,
      });

      setTeacherGroups((prev) =>
        prev.map((group) =>
          group.id === studentCreator.groupId
            ? {
                ...group,
                students: [
                  {
                    id: created.id,
                    username: created.username,
                    first_name: created.first_name,
                    last_name: created.last_name,
                    full_name: created.full_name || created.name,
                    progress: [],
                  },
                  ...group.students,
                ],
              }
            : group
        )
      );
      setStudentCreator(null);
      toast({
        title: "Ученик добавлен",
        description: `Логин: ${created.username}`,
      });
    } catch (error) {
      toast({
        title: "Не удалось создать ученика",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setCreatingStudent(false);
    }
  }

  async function handlePasswordReset(student: StudentInGroup) {
    try {
      const result = await resetStudentPassword(student.id);
      setPasswordReset(result);
    } catch (error) {
      toast({
        title: "Не удалось сбросить пароль",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    }
  }

  if (!mounted) {
    return <ListSkeleton rows={5} className="py-10" />;
  }

  if (!getStoredToken() || !user) {
    return (
      <EmptyState
        icon={User}
        title="Нужна авторизация"
        description="Войдите, чтобы открыть личный кабинет и рабочие экраны платформы."
        action={
          <Link href="/login">
            <Button>Перейти ко входу</Button>
          </Link>
        }
      />
    );
  }

  const isStudent = role === "student";
  const isTeacherOrAdmin = role === "teacher" || role === "superuser";

  return (
    <div className="content-block space-y-6">
      <PageHeader
        title="Рабочее пространство"
        description={`${displayName} · ${ROLE_LABELS[role ?? "student"] ?? "Пользователь"}`}
        compact
        actions={
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        }
      />

      <section className="hero-surface overflow-hidden rounded-[2rem] border border-border/60 px-6 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr] lg:items-end">
          <div className="space-y-4">
            <div className="kavnt-badge w-fit">
              {isStudent ? "Student workspace" : role === "superuser" ? "Admin workspace" : "Teacher workspace"}
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                {isStudent
                  ? "Спокойный кабинет для учебы, прогресса и следующего шага"
                  : "Операционный центр для групп, прогресса и управленческих действий"}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {isStudent
                  ? "Собрали в одном месте вашу траекторию, активность, достижения и быстрый доступ к чатам и ссылкам группы."
                  : "С этого экрана можно отслеживать успеваемость, открывать прогресс по трекам, выдавать доступы и поддерживать группы без лишнего шума."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(isStudent
              ? [
                  { label: "Активные треки", value: String(studentSummary.activeTracks) },
                  { label: "Средний прогресс", value: `${studentSummary.avgProgress}%` },
                  { label: "Завершено", value: String(studentSummary.completedCount) },
                  { label: "С опозданием", value: String(studentSummary.lateCount) },
                ]
              : [
                  { label: "Группы", value: String(teacherSummary.groups) },
                  { label: "Ученики", value: String(teacherSummary.students) },
                  { label: "Треки в работе", value: String(teacherSummary.totalTracks) },
                  { label: "Средний прогресс", value: `${teacherSummary.avgProgress}%` },
                ]).map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {loading ? <ListSkeleton rows={6} /> : null}

      {!loading && isStudent && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="progress">Прогресс</TabsTrigger>
            <TabsTrigger value="activity">Активность</TabsTrigger>
            <TabsTrigger value="resources">Ссылки и доступы</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Мой ритм обучения</CardTitle>
                  <CardDescription>
                    Главная идея экрана: вы сразу видите, что уже идет хорошо и что стоит добрать сегодня.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Группа</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                      {profile?.group?.title ?? "Без группы"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {profile?.group?.teacher_name
                        ? `Куратор: ${profile.group.teacher_name}`
                        : "Куратор будет указан после назначения."}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Достижения</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                      {profile?.achievements?.length ?? 0}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Каждое достижение фиксирует устойчивый прогресс, а не случайную активность.
                    </p>
                  </div>
                  <div className="md:col-span-2 rounded-3xl border border-border/70 bg-background/70 p-5">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Что сделать следующим
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {(profile?.progress ?? []).slice(0, 3).map((item) => (
                        <div key={item.track_id} className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                          <p className="text-sm font-medium text-foreground">{item.track_title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.completed} из {item.total} шагов завершено
                          </p>
                          <Progress value={item.percent} className="mt-4" />
                          <p className="mt-3 text-sm font-medium text-primary">{item.percent}% готово</p>
                        </div>
                      ))}
                      {(profile?.progress?.length ?? 0) === 0 && (
                        <div className="md:col-span-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                          Здесь появятся треки, когда вам назначат учебный маршрут.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Достижения</CardTitle>
                  <CardDescription>
                    Небольшая витрина того, что уже закрепилось в обучении.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(profile?.achievements ?? []).length > 0 ? (
                    profile?.achievements?.map((achievement) => (
                      <div key={achievement.id} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Trophy className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{achievement.title}</p>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {achievement.unlocked_at ? `Получено ${formatDate(achievement.unlocked_at)}` : "Открыто"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={Trophy}
                      title="Пока без достижений"
                      description="После первых завершенных шагов здесь начнет собираться ваша история прогресса."
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-3">
              {(profile?.progress ?? []).map((item) => (
                <Card key={item.track_id} className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg">{item.track_title}</CardTitle>
                    <CardDescription>
                      {item.completed} завершено, {item.started} в процессе
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Progress value={item.percent} className="h-2.5" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Прогресс</span>
                      <span className="font-medium text-foreground">{item.percent}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-2xl border border-border/60 bg-muted/15 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Всего</p>
                        <p className="mt-2 text-lg font-semibold">{item.total}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-muted/15 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Готово</p>
                        <p className="mt-2 text-lg font-semibold">{item.completed}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-muted/15 p-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">В работе</p>
                        <p className="mt-2 text-lg font-semibold">{item.started}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(profile?.progress?.length ?? 0) === 0 && (
                <div className="xl:col-span-3">
                  <EmptyState
                    icon={BookOpen}
                    title="Треки пока не назначены"
                    description="Как только появится учебный план, мы покажем его здесь в удобном формате."
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {(profile?.activity ?? []).length > 0 ? (
              profile?.activity?.map((item) => (
                <Card key={`${item.lesson_id}-${item.updated_at}`}>
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", statusBadge(item.status))}>
                          {statusLabel(item.status)}
                        </span>
                        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {LESSON_TYPE_LABELS[item.lesson_type] ?? item.lesson_type}
                        </span>
                      </div>
                      <div>
                        <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">{item.lesson_title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.track_title} · {formatDate(item.updated_at)}
                        </p>
                      </div>
                    </div>
                    {item.late_by_seconds ? (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
                        Опоздание: {formatLateSeconds(item.late_by_seconds)}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState
                icon={Activity}
                title="Активность пока не зафиксирована"
                description="После первых действий здесь появится понятная лента событий."
              />
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Чаты и полезные ссылки</CardTitle>
                <CardDescription>
                  QR и ссылки доступны отдельно, чтобы быстро открыть чат с телефона или отправить родителям.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.group_links?.child_chat_url ||
                profile?.group_links?.parent_chat_url ||
                (profile?.group_links?.links?.length ?? 0) > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <QrCodeCard title="Детский чат" url={profile?.group_links?.child_chat_url ?? ""} />
                    <QrCodeCard title="Родительский чат" url={profile?.group_links?.parent_chat_url ?? ""} />
                    {(profile?.group_links?.links ?? []).map((item, index) => (
                      <QrCodeCard key={`${item.label}-${index}`} title={item.label || `Ссылка ${index + 1}`} url={item.url} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={QrCode}
                    title="Ссылки пока не добавлены"
                    description="Как только преподаватель заполнит материалы группы, здесь появятся QR и быстрые переходы."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!loading && isTeacherOrAdmin && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="groups">Группы</TabsTrigger>
            <TabsTrigger value="activity">Аналитика</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-4">
              <StatCard title="Группы" value={teacherSummary.groups} description="Активные учебные группы" />
              <StatCard title="Ученики" value={teacherSummary.students} description="Всего в зоне ответственности" />
              <StatCard title="Средний прогресс" value={`${teacherSummary.avgProgress}%`} description="По всем трекам в работе" />
              <StatCard
                title="Активность за неделю"
                value={teacherAnalytics?.activity_heatmap?.reduce((sum, item) => sum + item.count, 0) ?? 0}
                description="События и завершения"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
              <AreaChartCard
                title="Динамика активности"
                description="Показывает, насколько регулярно группы двигаются по маршрутам."
                data={(teacherAnalytics?.activity_heatmap ?? []).map((item) => ({
                  date: formatShortDate(item.date),
                  count: item.count,
                }))}
              />
              <BarChartCard
                title="Форматы контента"
                description="Какие типы материалов чаще всего проходят ваши группы."
                data={Object.entries(teacherAnalytics?.lesson_type_breakdown ?? {}).map(([name, value]) => ({
                  name: LESSON_TYPE_LABELS[name] ?? name,
                  value,
                }))}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {(teacherAnalytics?.groups_summary ?? []).map((group) => (
                <Card key={group.group_id}>
                  <CardHeader>
                    <CardTitle>{group.group_title}</CardTitle>
                    <CardDescription>
                      {group.total_students} учеников · {group.completed_all} полностью завершили свои треки
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Средний прогресс</span>
                        <span className="font-medium text-foreground">{group.avg_percent}%</span>
                      </div>
                      <Progress value={group.avg_percent} className="h-2.5" />
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="rounded-full border border-border/60 bg-muted/15 px-3 py-1.5">
                        Late count: {group.late_count}
                      </span>
                      <span className="rounded-full border border-border/60 bg-muted/15 px-3 py-1.5">
                        Completed all: {group.completed_all}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(teacherAnalytics?.groups_summary?.length ?? 0) === 0 && (
                <div className="lg:col-span-2">
                  <EmptyState
                    icon={BarChart3}
                    title="Аналитика еще не накопилась"
                    description="Когда ученики начнут проходить задания, мы соберем здесь управленческий обзор."
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            {teacherGroups.map((group) => {
              const expanded = expandedStudents[group.id] ?? true;
              const totalStudents = group.students.length;
              const avgPercent = totalStudents
                ? Math.round(
                    group.students.reduce((sum, student) => {
                      const avg = student.progress.length
                        ? student.progress.reduce((trackSum, item) => trackSum + item.percent, 0) / student.progress.length
                        : 0;
                      return sum + avg;
                    }, 0) / totalStudents
                  )
                : 0;

              return (
                <Card key={group.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="border-b border-border/60 px-5 py-5 sm:px-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="kavnt-badge">
                              {role === "superuser" ? "Admin control" : "Teacher control"}
                            </span>
                            <span className="rounded-full border border-border/60 bg-muted/15 px-3 py-1 text-xs text-muted-foreground">
                              {totalStudents} учеников
                            </span>
                          </div>
                          <div>
                            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">{group.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Средний прогресс по группе {avgPercent}%. Ссылки, доступы и ученики управляются в одном месте.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedStudents((prev) => ({ ...prev, [group.id]: !expanded }))}
                          >
                            {expanded ? "Свернуть список" : "Показать учеников"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              setLinksEditor({
                                groupId: group.id,
                                groupTitle: group.title,
                                childChat: group.child_chat_url ?? "",
                                parentChat: group.parent_chat_url ?? "",
                                customLinks: (group.links ?? []).map((item) => `${item.label}|${item.url}`).join("\n"),
                              })
                            }
                          >
                            <Link2 className="h-4 w-4" />
                            Ссылки
                          </Button>
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() =>
                              setStudentCreator({
                                groupId: group.id,
                                groupTitle: group.title,
                                username: "",
                                first_name: "",
                                last_name: "",
                                password: "",
                              })
                            }
                          >
                            <Plus className="h-4 w-4" />
                            Добавить ученика
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-0 lg:grid-cols-[0.85fr,1.15fr]">
                      <div className="border-b border-border/60 p-5 lg:border-b-0 lg:border-r lg:p-6">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Детский чат</p>
                            <p className="mt-3 break-all text-sm text-foreground">{group.child_chat_url || "Не задан"}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Родительский чат</p>
                            <p className="mt-3 break-all text-sm text-foreground">{group.parent_chat_url || "Не задан"}</p>
                          </div>
                          <div className="sm:col-span-2 rounded-2xl border border-border/60 bg-muted/15 p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Публичные ссылки</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(group.links ?? []).length > 0 ? (
                                (group.links ?? []).map((item, index) => (
                                  <span
                                    key={`${item.url}-${index}`}
                                    className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground"
                                  >
                                    {item.label}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">Пока ничего не добавлено.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 lg:p-6">
                        {expanded ? (
                          <div className="space-y-4">
                            {group.students.map((student) => (
                              <div key={student.id} className="rounded-3xl border border-border/70 bg-background/80 p-4">
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                  <div>
                                    <p className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                                      {student.full_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">@{student.username}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                      onClick={() => void handlePasswordReset(student)}
                                    >
                                      <KeyRound className="h-4 w-4" />
                                      Новый пароль
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-3">
                                  {student.progress.length > 0 ? (
                                    student.progress.map((track) => (
                                      <button
                                        key={track.track_id}
                                        type="button"
                                        onClick={() => void openTrackDetail(student, track.track_id, track.track_title)}
                                        className="rounded-2xl border border-border/60 bg-muted/15 p-4 text-left transition hover:border-primary/40 hover:bg-primary/5"
                                      >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <div>
                                            <p className="font-medium text-foreground">{track.track_title}</p>
                                            <p className="text-sm text-muted-foreground">
                                              {track.completed} из {track.total} завершено · {track.started} в работе
                                            </p>
                                          </div>
                                          <div className="text-sm font-medium text-primary">Открыть детали</div>
                                        </div>
                                        <Progress value={track.percent} className="mt-4" />
                                      </button>
                                    ))
                                  ) : (
                                    <div className="rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                                      У ученика пока нет назначенных треков.
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {group.students.length === 0 && (
                              <EmptyState
                                icon={UsersRound}
                                title="В группе пока нет учеников"
                                description="Добавьте первого ученика, и кабинет сразу начнет собирать прогресс и аналитику."
                              />
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {teacherGroups.length === 0 && (
              <EmptyState
                icon={UsersRound}
                title="Группы пока не назначены"
                description="Когда появятся группы, здесь откроется единый workspace для сопровождения студентов."
              />
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
              <ProgressDonut
                title="Структура прогресса"
                completed={(teacherAnalytics?.groups_summary ?? []).reduce((sum, item) => sum + item.completed_all, 0)}
                started={Math.max(
                  teacherSummary.totalTracks -
                    (teacherAnalytics?.groups_summary ?? []).reduce((sum, item) => sum + item.completed_all, 0),
                  0
                )}
                notStarted={Math.max(teacherSummary.students, 1)}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Сигналы для внимания</CardTitle>
                  <CardDescription>
                    Быстрый список зон, где преподавателю или администратору стоит вмешаться в первую очередь.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(teacherAnalytics?.groups_summary ?? [])
                    .slice()
                    .sort((a, b) => b.late_count - a.late_count)
                    .map((item) => (
                      <div key={item.group_id} className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-foreground">{item.group_title}</p>
                            <p className="text-sm text-muted-foreground">Средний прогресс {item.avg_percent}%</p>
                          </div>
                          <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-sm text-amber-800">
                            <Flame className="h-4 w-4" />
                            Late count: {item.late_count}
                          </div>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={Boolean(linksEditor)} onOpenChange={(open) => !open && setLinksEditor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ссылки группы</DialogTitle>
            <DialogDescription>
              {linksEditor ? `Обновите чаты и материалы для группы «${linksEditor.groupTitle}».` : ""}
            </DialogDescription>
          </DialogHeader>

          {linksEditor ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Детский чат</label>
                <Input
                  value={linksEditor.childChat}
                  onChange={(event) => setLinksEditor({ ...linksEditor, childChat: event.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Родительский чат</label>
                <Input
                  value={linksEditor.parentChat}
                  onChange={(event) => setLinksEditor({ ...linksEditor, parentChat: event.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Дополнительные ссылки</label>
                <textarea
                  value={linksEditor.customLinks}
                  onChange={(event) => setLinksEditor({ ...linksEditor, customLinks: event.target.value })}
                  placeholder={"Материалы | https://example.com\nTelegram | https://t.me/..."}
                  className="min-h-[140px] w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground">Одна строка = одна ссылка в формате «Название | URL».</p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinksEditor(null)}>
              Отмена
            </Button>
            <Button onClick={() => void handleSaveLinks()} disabled={savingLinks}>
              {savingLinks ? "Сохраняю..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(studentCreator)} onOpenChange={(open) => !open && setStudentCreator(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый ученик</DialogTitle>
            <DialogDescription>
              {studentCreator ? `Создаем ученика сразу внутри группы «${studentCreator.groupTitle}».` : ""}
            </DialogDescription>
          </DialogHeader>

          {studentCreator ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">Логин</label>
                <Input
                  value={studentCreator.username}
                  onChange={(event) => setStudentCreator({ ...studentCreator, username: event.target.value })}
                  placeholder="student_01"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Имя</label>
                <Input
                  value={studentCreator.first_name}
                  onChange={(event) => setStudentCreator({ ...studentCreator, first_name: event.target.value })}
                  placeholder="Иван"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Фамилия</label>
                <Input
                  value={studentCreator.last_name}
                  onChange={(event) => setStudentCreator({ ...studentCreator, last_name: event.target.value })}
                  placeholder="Петров"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-foreground">Временный пароль</label>
                <Input
                  type="password"
                  value={studentCreator.password}
                  onChange={(event) => setStudentCreator({ ...studentCreator, password: event.target.value })}
                  placeholder="Не короче 6 символов"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentCreator(null)}>
              Отмена
            </Button>
            <Button onClick={() => void handleCreateStudent()} disabled={creatingStudent}>
              {creatingStudent ? "Создаю..." : "Создать ученика"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trackDetail.open} onOpenChange={(open) => setTrackDetail((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{trackDetail.trackTitle || "Прогресс по треку"}</DialogTitle>
            <DialogDescription>{trackDetail.studentName}</DialogDescription>
          </DialogHeader>

          {trackDetail.loading ? (
            <ListSkeleton rows={4} />
          ) : trackDetail.data ? (
            <div className="space-y-3">
              {trackDetail.data.lessons.map((lesson) => (
                <div key={lesson.lesson_id} className="rounded-2xl border border-border/70 bg-muted/15 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">{lesson.lesson_title}</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.lesson_type_label || LESSON_TYPE_LABELS[lesson.lesson_type] || lesson.lesson_type}
                      </p>
                    </div>
                    <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", statusBadge(lesson.status))}>
                      {statusLabel(lesson.status)}
                    </span>
                  </div>
                  {lesson.late_by_seconds ? (
                    <p className="mt-3 text-sm text-amber-700">Опоздание: {formatLateSeconds(lesson.late_by_seconds)}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Детали прогресса недоступны"
              description="Сейчас сервер не вернул данные по этому треку."
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(passwordReset)} onOpenChange={(open) => !open && setPasswordReset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый пароль создан</DialogTitle>
            <DialogDescription>Передайте данные ученику безопасным способом.</DialogDescription>
          </DialogHeader>
          {passwordReset ? (
            <div className="space-y-3 rounded-3xl border border-border/70 bg-muted/20 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Логин</p>
                <p className="mt-2 font-medium text-foreground">{passwordReset.username}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Пароль</p>
                <p className="mt-2 font-mono text-lg text-foreground">{passwordReset.password}</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setPasswordReset(null)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

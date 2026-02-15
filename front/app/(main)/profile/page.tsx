"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, LogOut, Activity, BarChart3, CheckCircle2, CircleDot, BookOpen, UsersRound, ChevronDown, ChevronRight, KeyRound, QrCode, Link2, Plus, Trash2, Trophy, Clock, Flame, UserPlus } from "lucide-react";
import { formatLateSeconds } from "@/components/availability-countdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getStoredToken, getStoredUser, getStoredRole, clearStoredToken, clearStoredRole, clearStoredUser } from "@/lib/api/auth";
import { fetchProfile, type ProfileData, type GroupLinks } from "@/lib/api/profile";
import { fetchTeacherGroupsProgress, updateGroupLinks, fetchStudentTrackProgress, type GroupWithStudents, type StudentInGroup, type GroupLink } from "@/lib/api/teacher";
import { fetchTeacherAnalytics, type TeacherAnalytics } from "@/lib/api/analytics";
import { ProgressDonut, BarChartCard, AreaChartCard, StatCard } from "@/components/charts";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { resetStudentPassword, createStudentInGroup } from "@/lib/api/users";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/components/lib/utils";
import { QrCodeCard } from "@/components/qr-code-card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/loading-skeleton";

const LESSON_TYPE_LABELS: Record<string, string> = {
  lecture: "Лекция",
  task: "Задача",
  puzzle: "Пазл",
  question: "Вопрос",
  survey: "Опрос",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ full_name: string; first_name?: string; last_name?: string; username: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [teacherGroups, setTeacherGroups] = useState<GroupWithStudents[]>([]);
  const [teacherAnalytics, setTeacherAnalytics] = useState<TeacherAnalytics | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [adminPanelGroupId, setAdminPanelGroupId] = useState<string | null>(null);
  const [trackDetail, setTrackDetail] = useState<{
    studentId: string;
    studentName: string;
    trackId: string;
    trackTitle: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser());
    setRole(getStoredRole());
  }, []);

  useEffect(() => {
    if (!mounted || !getStoredToken()) {
      setLoadingProfile(false);
      return;
    }
    let cancelled = false;
    if (role === "student") {
      fetchProfile().then((p) => {
        if (!cancelled) {
          setProfile(p ?? null);
          setLoadingProfile(false);
        }
      });
    } else if (role === "teacher" || role === "superuser") {
      Promise.all([fetchTeacherGroupsProgress(), fetchTeacherAnalytics()]).then(([groupsRes, analyticsRes]) => {
        if (!cancelled) {
          setTeacherGroups(groupsRes?.groups ?? []);
          setTeacherAnalytics(analyticsRes ?? null);
          setLoadingProfile(false);
        }
      });
    } else {
      setLoadingProfile(false);
    }
    return () => {
      cancelled = true;
    };
  }, [mounted, role]);

  function openTrackDetail(student: StudentInGroup, progress: { track_id: string; track_title: string }) {
    setTrackDetail({
      studentId: student.id,
      studentName: student.full_name,
      trackId: progress.track_id,
      trackTitle: progress.track_title,
    });
  }

  function toggleStudent(studentId: string) {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function handleLogout() {
    clearStoredToken();
    clearStoredRole();
    clearStoredUser();
    router.push("/login");
    router.refresh();
  }

  if (!mounted) {
    return <ListSkeleton rows={4} className="py-8" />;
  }

  if (!getStoredToken() || !user) {
    return (
      <EmptyState
        icon={User}
        title="Требуется авторизация"
        description="Войдите, чтобы открыть личный кабинет."
        action={
          <Link href="/login">
            <Button>Войти</Button>
          </Link>
        }
      />
    );
  }

  const displayName = user.full_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const isStudent = role === "student";
  const isTeacherOrAdmin = role === "teacher" || role === "superuser";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Личный кабинет"
        description={`${displayName} · ${role === "superuser" ? "Администратор" : role === "teacher" ? "Преподаватель" : "Студент"}`}
        actions={
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        }
      />

      {/* ── Student view ── */}
      {isStudent && (
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList>
            <TabsTrigger value="info">Профиль</TabsTrigger>
            <TabsTrigger value="progress">Успеваемость</TabsTrigger>
            <TabsTrigger value="activity">Активность</TabsTrigger>
          </TabsList>

          {/* Tab: Профиль */}
          <TabsContent value="info" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Данные
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Имя</p>
                    <p className="text-sm">{displayName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Логин</p>
                    <p className="text-sm font-mono">{user.username}</p>
                  </div>
                  {profile?.group && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Группа</p>
                      <p className="text-sm">
                        {profile.group.title}
                        {profile.group.teacher_name ? ` (${profile.group.teacher_name})` : ""}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Достижения
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile?.achievements && profile.achievements.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profile.achievements.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                          title={a.description}
                        >
                          <span className="text-lg">{a.icon}</span>
                          <div>
                            <p className="text-xs font-medium">{a.title}</p>
                            <p className="text-[11px] text-muted-foreground">{a.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Пока нет достижений. Выполняйте задания, чтобы получить их.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* QR-коды */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Ссылки и чаты
                </CardTitle>
                <CardDescription>Отсканируйте QR-код для перехода</CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.group_links?.child_chat_url || profile?.group_links?.parent_chat_url || (profile?.group_links?.links?.length ?? 0) > 0 ? (
                  <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
                    <QrCodeCard title="Детский чат" url={profile?.group_links?.child_chat_url ?? ""} />
                    <QrCodeCard title="Родительский чат" url={profile?.group_links?.parent_chat_url ?? ""} />
                    {profile?.group_links?.links?.map((l, i) => (
                      <QrCodeCard key={i} title={l.label || `Ссылка ${i + 1}`} url={l.url ?? ""} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    QR-коды появятся, когда учитель добавит ссылки для вашей группы.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Успеваемость */}
          <TabsContent value="progress" className="space-y-6">
            {!loadingProfile && profile?.progress && profile.progress.length > 0 && (() => {
              const totalCompleted = profile.progress.reduce((s, p) => s + p.completed, 0);
              const totalStarted = profile.progress.reduce((s, p) => s + p.started, 0);
              const totalLessons = profile.progress.reduce((s, p) => s + p.total, 0);
              const notStarted = totalLessons - totalCompleted - totalStarted;
              return (
                <ProgressDonut
                  completed={totalCompleted}
                  started={totalStarted}
                  notStarted={Math.max(0, notStarted)}
                  title="Общий прогресс"
                />
              );
            })()}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Прогресс по трекам
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProfile ? (
                  <ListSkeleton rows={3} />
                ) : profile?.progress && profile.progress.length > 0 ? (
                  <div className="space-y-4">
                    {profile.progress.map((p) => (
                      <div key={p.track_id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <Link
                            href={`/main/${p.track_id}`}
                            className="font-medium hover:underline flex items-center gap-2"
                          >
                            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                            {p.track_title}
                          </Link>
                          <span className="text-muted-foreground tabular-nums">
                            {p.completed}/{p.total} ({p.percent}%)
                          </span>
                        </div>
                        <Progress value={p.percent} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={BarChart3}
                    title="Нет данных"
                    description="Начните проходить треки, чтобы видеть прогресс."
                    className="py-8"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Активность */}
          <TabsContent value="activity" className="space-y-6">
            {!loadingProfile && profile?.activity && profile.activity.length > 0 && (() => {
              const completed = profile.activity.filter((a) => a.status === "completed" || a.status === "completed_late").length;
              const late = profile.activity.filter((a) => a.status === "completed_late").length;
              const dates = profile.activity
                .map((a) => a.updated_at)
                .filter(Boolean)
                .map((iso) => iso!.slice(0, 10));
              const uniqueDates = Array.from(new Set(dates)).sort();
              let streak = 0;
              const today = new Date().toISOString().slice(0, 10);
              for (let i = 0; i < 365; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const key = d.toISOString().slice(0, 10);
                if (uniqueDates.includes(key)) streak++;
                else break;
              }
              const last30 = Array.from({ length: 30 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (29 - i));
                return d.toISOString().slice(0, 10);
              });
              const activityByDay = last30.map((date) => ({
                date: date.slice(5),
                count: profile!.activity.filter((a) => a.updated_at?.slice(0, 10) === date).length,
              }));
              const typeCounts: Record<string, number> = { lecture: 0, task: 0, puzzle: 0, question: 0, survey: 0 };
              profile.activity.forEach((a) => {
                if (a.status === "completed" || a.status === "completed_late") {
                  if (a.lesson_type in typeCounts) typeCounts[a.lesson_type]++;
                }
              });
              const lessonTypeData = [
                { name: "Лекции", value: typeCounts.lecture },
                { name: "Задачи", value: typeCounts.task },
                { name: "Пазлы", value: typeCounts.puzzle },
                { name: "Вопросы", value: typeCounts.question },
                { name: "Опросы", value: typeCounts.survey },
              ];
              return (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard title="Выполнено" value={completed} icon={CheckCircle2} />
                    <StatCard title="Просрочено" value={late} icon={Clock} />
                    <StatCard title="Серия дней" value={streak} description="дней подряд с активностью" icon={Flame} />
                  </div>
                  <AreaChartCard
                    title="Активность по дням"
                    description="Последние 30 дней"
                    data={activityByDay}
                  />
                  <BarChartCard
                    title="По типу заданий"
                    data={lessonTypeData}
                  />
                </>
              );
            })()}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Последние действия
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProfile ? (
                  <ListSkeleton rows={4} />
                ) : profile?.activity && profile.activity.length > 0 ? (
                  <ul className="space-y-3">
                    {profile.activity.map((a, i) => (
                      <li key={`${a.lesson_id}-${i}`} className="flex items-start gap-3 text-sm">
                        {a.status === "completed" || a.status === "completed_late" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                        ) : (
                          <CircleDot className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{a.lesson_title}</p>
                          <p className="text-muted-foreground text-xs">
                            {a.track_title} · {LESSON_TYPE_LABELS[a.lesson_type] ?? a.lesson_type}
                            {a.status === "completed_late" && (a.late_by_seconds ?? 0) > 0
                              ? ` · Просрочка ${formatLateSeconds(a.late_by_seconds!)}`
                              : ""}
                            {" · "}{formatDate(a.updated_at)}
                          </p>
                        </div>
                        <Link href={a.track_id ? `/main/${a.track_id}/lesson/${a.lesson_id}` : (a.lesson_type === "survey" ? `/surveys/${a.lesson_id}` : a.lesson_type === "lecture" ? `/lectures/${a.lesson_id}` : a.lesson_type === "task" ? `/tasks/${a.lesson_id}` : a.lesson_type === "puzzle" ? `/puzzles/${a.lesson_id}` : `/questions/${a.lesson_id}`)}>
                          <Button variant="ghost" size="sm">Открыть</Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={Activity}
                    title="Нет активности"
                    description="Выполняйте задания, чтобы видеть историю."
                    className="py-8"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* ── Teacher / Admin view ── */}
      {isTeacherOrAdmin && (
        <div className="space-y-6">
          {!loadingProfile && teacherAnalytics && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Всего учеников"
                  value={teacherAnalytics.groups_summary.reduce((s, g) => s + g.total_students, 0)}
                  icon={UsersRound}
                />
                <StatCard
                  title="Средний прогресс"
                  value={
                    teacherAnalytics.groups_summary.length > 0
                      ? `${Math.round(
                          teacherAnalytics.groups_summary.reduce((s, g) => s + g.avg_percent, 0) /
                            teacherAnalytics.groups_summary.length
                        )}%`
                      : "0%"
                  }
                  icon={BarChart3}
                />
                <StatCard
                  title="Просрочек"
                  value={teacherAnalytics.groups_summary.reduce((s, g) => s + g.late_count, 0)}
                  icon={Clock}
                />
                <StatCard
                  title="Самая активная группа"
                  value={
                    teacherAnalytics.groups_summary.length > 0
                      ? teacherAnalytics.groups_summary.reduce((a, b) =>
                          (a.avg_percent >= b.avg_percent ? a : b)
                        ).group_title
                      : "—"
                  }
                  icon={Activity}
                />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <BarChartCard
                  title="Средний прогресс по группам"
                  data={teacherAnalytics.groups_summary.map((g) => ({
                    name: g.group_title.length > 18 ? g.group_title.slice(0, 18) + "…" : g.group_title,
                    value: g.avg_percent,
                  }))}
                />
                <AreaChartCard
                  title="Активность по дням"
                  description="Последние 30 дней"
                  data={teacherAnalytics.activity_heatmap.map((h) => ({ date: h.date.slice(5), count: h.count }))}
                />
              </div>
              {(() => {
                const breakdown = teacherAnalytics.lesson_type_breakdown;
                const pieData = [
                  { name: "Лекции", value: breakdown.lectures ?? 0, color: "hsl(var(--primary))" },
                  { name: "Задачи", value: breakdown.tasks ?? 0, color: "hsl(var(--success))" },
                  { name: "Пазлы", value: breakdown.puzzles ?? 0, color: "hsl(var(--warning))" },
                  { name: "Вопросы", value: breakdown.questions ?? 0, color: "hsl(var(--info))" },
                  { name: "Опросы", value: breakdown.surveys ?? 0, color: "hsl(var(--muted-foreground))" },
                ].filter((d) => d.value > 0);
                if (pieData.length === 0) pieData.push({ name: "Нет данных", value: 1, color: "hsl(var(--muted))" });
                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Типы заданий (выполнено)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </>
          )}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UsersRound className="h-4 w-4" />
                Группы
              </CardTitle>
              <CardDescription>
                Нажмите на группу для управления
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <ListSkeleton rows={3} />
              ) : teacherGroups.length === 0 ? (
                <EmptyState
                  icon={UsersRound}
                  title="Нет групп"
                  description={role === "teacher" ? "Вы видите только группы, которые ведёте." : "Создайте группу в разделе администрирования."}
                  className="py-8"
                />
              ) : (
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
                  {teacherGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setAdminPanelGroupId(group.id)}
                      className="aspect-square rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors flex flex-col items-center justify-center gap-1 p-3 text-center"
                    >
                      <UsersRound className="h-7 w-7 shrink-0 text-muted-foreground" />
                      <span className="font-medium text-sm line-clamp-2">{group.title}</span>
                      <span className="text-xs text-muted-foreground">{group.students.length} уч.</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {adminPanelGroupId && (() => {
            const group = teacherGroups.find((g) => g.id === adminPanelGroupId);
            if (!group) return null;
            return (
              <Dialog open={!!adminPanelGroupId} onOpenChange={(open) => !open && setAdminPanelGroupId(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UsersRound className="h-5 w-5" />
                      {group.title}
                    </DialogTitle>
                    <DialogDescription>
                      Ссылки для QR-кодов и прогресс учеников
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto space-y-4 py-2">
                    <GroupLinksEditor
                      group={group}
                      onSaved={(updated) => {
                        setTeacherGroups((prev) =>
                          prev.map((g) =>
                            g.id === updated.id
                              ? { ...g, child_chat_url: updated.child_chat_url, parent_chat_url: updated.parent_chat_url, links: updated.links }
                              : g
                          )
                        );
                      }}
                    />
                    <AddStudentToGroupBlock
                      groupId={group.id}
                      groupTitle={group.title}
                      onAdded={() => {
                        fetchTeacherGroupsProgress().then((res) => {
                          if (res?.groups) setTeacherGroups(res.groups);
                        });
                      }}
                    />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Ученики</h4>
                      {group.students.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">В группе пока нет учеников. Добавьте ученика выше.</p>
                      ) : (
                        <div className="space-y-3">
                          {group.students.map((student) => (
                            <StudentProgressCard
                              key={student.id}
                              student={student}
                              expanded={expandedStudents.has(student.id)}
                              onToggle={() => toggleStudent(student.id)}
                              showCredentials
                              onTrackClick={openTrackDetail}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })()}

          {trackDetail && (
            <TrackDetailDialog
              studentId={trackDetail.studentId}
              studentName={trackDetail.studentName}
              trackId={trackDetail.trackId}
              trackTitle={trackDetail.trackTitle}
              open={!!trackDetail}
              onClose={() => setTrackDetail(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-components (unchanged logic) ── */

function TrackDetailDialog({
  studentId,
  studentName,
  trackId,
  trackTitle,
  open,
  onClose,
}: {
  studentId: string;
  studentName: string;
  trackId: string;
  trackTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchStudentTrackProgress>>>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !studentId || !trackId) return;
    setLoading(true);
    fetchStudentTrackProgress(studentId, trackId).then((res) => {
      setData(res);
      setLoading(false);
    });
  }, [open, studentId, trackId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {trackTitle}
          </DialogTitle>
          <DialogDescription>
            {studentName} — задания трека
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <ListSkeleton rows={4} />
          ) : data?.lessons?.length ? (
            <ul className="space-y-2">
              {data.lessons.map((l) => {
                const isDone = l.status === "completed" || l.status === "completed_late";
                return (
                  <li
                    key={l.lesson_id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg border text-sm",
                      isDone
                        ? "bg-green-500/10 border-green-500/30"
                        : l.status === "started"
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-muted/30 border-border/60"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : l.status === "started" ? (
                      <CircleDot className="h-4 w-4 shrink-0 text-amber-600" />
                    ) : (
                      <CircleDot className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="font-medium flex-1 min-w-0 truncate">{l.lesson_title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {l.status === "completed_late" && (l.late_by_seconds ?? 0) > 0
                        ? `${l.lesson_type_label} · Просрочка ${formatLateSeconds(l.late_by_seconds!)}`
                        : l.lesson_type_label}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Нет уроков в треке</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddStudentToGroupBlock({
  groupId,
  groupTitle,
  onAdded,
}: {
  groupId: string;
  groupTitle: string;
  onAdded: () => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim() || !form.first_name.trim() || !form.last_name.trim() || !form.password) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Ошибка", description: "Пароль не менее 6 символов", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await createStudentInGroup(groupId, {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        password: form.password,
      });
      toast({
        title: "Ученик добавлен",
        description: `Логин: ${created.username} · Пароль: указанный при создании. Сообщите их ученику.`,
      });
      setForm({ username: "", first_name: "", last_name: "", password: "" });
      onAdded();
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось создать ученика",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-primary/10 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Добавить ученика в группу «{groupTitle}»</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <form onSubmit={handleSubmit} className="space-y-3 px-3 pb-3 pt-0 border-t border-primary/10">
          <div className="grid gap-2 sm:grid-cols-2 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Имя</Label>
              <Input
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                placeholder="Иван"
                className="text-sm h-9"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Фамилия</Label>
              <Input
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                placeholder="Иванов"
                className="text-sm h-9"
                disabled={submitting}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Логин</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              placeholder="ivanov"
              className="text-sm h-9"
              disabled={submitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Пароль</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Не менее 6 символов"
              className="text-sm h-9"
              disabled={submitting}
            />
          </div>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Создание..." : "Создать ученика"}
          </Button>
        </form>
      )}
    </div>
  );
}

function GroupLinksEditor({
  group,
  onSaved,
}: {
  group: GroupWithStudents;
  onSaved: (updated: { id: string; child_chat_url: string; parent_chat_url: string; links: GroupLink[] }) => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [childUrl, setChildUrl] = useState(group.child_chat_url ?? "");
  const [parentUrl, setParentUrl] = useState(group.parent_chat_url ?? "");
  const [links, setLinks] = useState<GroupLink[]>(group.links ?? []);
  const [saving, setSaving] = useState(false);

  function addLink() {
    setLinks((prev) => [...prev, { label: "", url: "" }]);
  }

  function updateLink(i: number, patch: Partial<GroupLink>) {
    setLinks((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, j) => j !== i));
  }

  async function handleSave(e: React.FormEvent) {
    e.stopPropagation();
    setSaving(true);
    try {
      const res = await updateGroupLinks(group.id, {
        child_chat_url: childUrl.trim(),
        parent_chat_url: parentUrl.trim(),
        links: links.filter((l) => l.label?.trim() || l.url?.trim()).map((l) => ({ label: l.label || "", url: l.url || "" })),
      });
      if (res) {
        toast({ title: "Ссылки сохранены" });
        onSaved(res);
      } else {
        toast({ title: "Ошибка", description: "Не удалось сохранить", variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Ссылки для QR-кодов</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <form onSubmit={handleSave} className="space-y-3 px-3 pb-3 pt-0 border-t">
          <div className="grid gap-2 sm:grid-cols-2 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Детский чат</Label>
              <Input
                value={childUrl}
                onChange={(e) => setChildUrl(e.target.value)}
                placeholder="https://..."
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Родительский чат</Label>
              <Input
                value={parentUrl}
                onChange={(e) => setParentUrl(e.target.value)}
                placeholder="https://..."
                className="text-sm h-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Дополнительные ссылки</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addLink} className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" />
                Добавить
              </Button>
            </div>
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={l.label}
                  onChange={(e) => updateLink(i, { label: e.target.value })}
                  placeholder="Название"
                  className="text-sm h-9 flex-1"
                />
                <Input
                  value={l.url}
                  onChange={(e) => updateLink(i, { url: e.target.value })}
                  placeholder="https://..."
                  className="text-sm h-9 flex-1"
                />
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeLink(i)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить ссылки"}
          </Button>
        </form>
      )}
    </div>
  );
}

function StudentProgressCard({
  student,
  expanded,
  onToggle,
  showCredentials = false,
  onTrackClick,
}: {
  student: StudentInGroup;
  expanded: boolean;
  onToggle: () => void;
  showCredentials?: boolean;
  onTrackClick?: (student: StudentInGroup, progress: { track_id: string; track_title: string }) => void;
}) {
  const { toast } = useToast();
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function handleResetPassword() {
    setResetting(true);
    try {
      const { username, password } = await resetStudentPassword(student.id);
      setResetPasswordValue(password);
      toast({ title: "Пароль сброшен", description: "Новый пароль сгенерирован." });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось сбросить пароль",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  }

  const avgPercent =
    student.progress.length > 0
      ? Math.round(
          student.progress.reduce((s, p) => s + p.percent, 0) / student.progress.length
        )
      : 0;

  return (
    <div className="rounded-lg border overflow-hidden">
      <div
        className={cn(
          "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors",
          expanded && "border-b"
        )}
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <User className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{student.full_name}</p>
          <p className="text-xs text-muted-foreground font-mono">{student.username}</p>
        </div>
        <div className="text-right shrink-0 flex items-center gap-2">
          {showCredentials && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setCredentialsOpen(true);
                setResetPasswordValue(null);
              }}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Данные
            </Button>
          )}
          <div>
            <p className="text-sm font-medium tabular-nums">{avgPercent}%</p>
            <p className="text-[11px] text-muted-foreground">
              {student.progress.filter((p) => p.percent === 100).length}/{student.progress.length}
            </p>
          </div>
        </div>
      </div>

      {showCredentials && (
        <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Учётные данные</DialogTitle>
              <DialogDescription>
                {student.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Логин</p>
                <p className="font-mono text-sm bg-muted px-3 py-2 rounded-md">{student.username}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Пароль</p>
                {resetPasswordValue ? (
                  <p className="font-mono text-sm bg-muted px-3 py-2 rounded-md break-all">{resetPasswordValue}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Пароль зашифрован. Сбросьте, чтобы получить новый.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCredentialsOpen(false)}>
                Закрыть
              </Button>
              <Button onClick={handleResetPassword} disabled={resetting}>
                {resetting ? "Сброс..." : "Сбросить пароль"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {expanded && (
        <div className="p-3 space-y-3">
          {student.progress.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет данных о прогрессе</p>
          ) : (
            student.progress.map((p) => (
              <div key={p.track_id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackClick?.(student, p);
                    }}
                    className="font-medium hover:underline flex items-center gap-1.5 text-left"
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    {p.track_title}
                  </button>
                  <span className="text-muted-foreground tabular-nums">
                    {p.completed}/{p.total} ({p.percent}%)
                  </span>
                </div>
                <Progress value={p.percent} className="h-1.5" />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

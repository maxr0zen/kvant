"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, LogOut, Activity, BarChart3, CheckCircle2, CircleDot, BookOpen, UsersRound, ChevronDown, ChevronRight, KeyRound, QrCode, Link2, Plus, Trash2, Trophy } from "lucide-react";
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
import { resetStudentPassword } from "@/lib/api/users";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/components/lib/utils";
import { QrCodeCard } from "@/components/qr-code-card";

const LESSON_TYPE_LABELS: Record<string, string> = {
  lecture: "Лекция",
  task: "Задача",
  puzzle: "Пазл",
  question: "Вопрос",
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
      fetchTeacherGroupsProgress().then((res) => {
        if (!cancelled) {
          setTeacherGroups(res?.groups ?? []);
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
    return (
      <div className="flex-1 flex items-center justify-center min-h-0">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (!getStoredToken() || !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 gap-4">
        <p className="text-muted-foreground">Войдите в систему, чтобы открыть личный кабинет.</p>
        <Link href="/login">
          <Button>Войти</Button>
        </Link>
      </div>
    );
  }

  const displayName = user.full_name || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;

  return (
    <div className="w-full max-w-none flex-1 min-h-0 flex flex-col gap-8 overflow-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Личный кабинет</h1>
        <p className="text-muted-foreground mt-1">Добро пожаловать, {displayName}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Левая колонка: Профиль + Достижения */}
        <div className="lg:col-span-1 flex flex-col gap-6 w-full min-w-0">
          <Card className="rounded-xl border-border/60 shadow-sm shrink-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Профиль
              </CardTitle>
              <CardDescription>Ваши данные</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Имя</p>
                <p className="text-base">{displayName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Логин</p>
                <p className="text-base font-mono">{user.username}</p>
              </div>
            </CardContent>
          </Card>

          {role === "student" && (
            <Card className="rounded-xl border-border/60 shadow-sm shrink-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Достижения
                </CardTitle>
                <CardDescription>
                  Разблокируйте достижения, выполняя лекции и задания
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.achievements && profile.achievements.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {profile.achievements.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                        title={a.description}
                      >
                        <span className="text-xl">{a.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Пока нет достижений. Выполняйте лекции и задания в треках, чтобы получить их.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

      {role === "student" && (
        <div className="lg:col-span-2 space-y-6 flex flex-col min-h-0">
          {/* QR-коды для учеников */}
          <Card className="rounded-xl border-border/50 shadow-sm overflow-hidden flex flex-col min-h-[280px]">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Ссылки и чаты
              </CardTitle>
              <CardDescription>Отсканируйте QR-код для перехода в чат или по ссылке</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-4 pt-0">
              {profile?.group_links?.child_chat_url || profile?.group_links?.parent_chat_url || (profile?.group_links?.links?.length ?? 0) > 0 ? (
                <div className="grid gap-5 auto-rows-fr h-full min-h-[260px] w-full" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                  <QrCodeCard title="Детский чат" url={profile?.group_links?.child_chat_url ?? ""} />
                  <QrCodeCard title="Родительский чат" url={profile?.group_links?.parent_chat_url ?? ""} />
                  {profile?.group_links?.links?.map((l, i) => (
                    <QrCodeCard key={i} title={l.label || `Ссылка ${i + 1}`} url={l.url ?? ""} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 py-12 px-6 text-center h-full min-h-[200px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    QR-коды появятся, когда учитель добавит ссылки для вашей группы.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Успеваемость
              </CardTitle>
              <CardDescription>Прогресс по доступным трекам</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <p className="text-sm text-muted-foreground">Загрузка...</p>
              ) : profile?.progress && profile.progress.length > 0 ? (
                <div className="space-y-4">
                  {profile.progress.map((p) => (
                    <div key={p.track_id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <Link
                          href={`/tracks/${p.track_id}`}
                          className="font-medium hover:underline flex items-center gap-2"
                        >
                          <BookOpen className="h-4 w-4 shrink-0" />
                          {p.track_title}
                        </Link>
                        <span className="text-muted-foreground">
                          {p.completed} / {p.total} ({p.percent}%)
                        </span>
                      </div>
                      <Progress value={p.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Нет данных о прогрессе. Начните проходить треки.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Активность
              </CardTitle>
              <CardDescription>Последние действия по урокам</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <p className="text-sm text-muted-foreground">Загрузка...</p>
              ) : profile?.activity && profile.activity.length > 0 ? (
                <ul className="space-y-3">
                  {profile.activity.map((a, i) => (
                    <li key={`${a.lesson_id}-${i}`} className="flex items-start gap-3 text-sm">
                      {a.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                      ) : (
                        <CircleDot className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{a.lesson_title}</p>
                        <p className="text-muted-foreground text-xs">
                          {a.track_title} · {LESSON_TYPE_LABELS[a.lesson_type] ?? a.lesson_type} · {formatDate(a.updated_at)}
                        </p>
                      </div>
                      <Link href={`/tracks/${a.track_id}/lesson/${a.lesson_id}`}>
                        <Button variant="ghost" size="sm">Открыть</Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Пока нет активности. Выполните задания в треках.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {(role === "teacher" || role === "superuser") && (
        <div className="lg:col-span-2 xl:col-span-2 space-y-6">
          <Card className="rounded-xl border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="h-5 w-5" />
                Группы
              </CardTitle>
              <CardDescription>
                Нажмите на группу для администрирования
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <p className="text-sm text-muted-foreground">Загрузка...</p>
              ) : teacherGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Нет групп для отображения. {role === "teacher" ? "Учитель видит только группы, которые ведёт." : ""}
                </p>
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
                  {teacherGroups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setAdminPanelGroupId(group.id)}
                      className="aspect-square rounded-xl border border-border/60 bg-card hover:bg-muted/50 hover:border-primary/40 transition-all flex flex-col items-center justify-center gap-1 p-3 text-center"
                    >
                      <UsersRound className="h-8 w-8 shrink-0 text-muted-foreground" />
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
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Ученики</h4>
                      {group.students.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">В группе пока нет учеников</p>
                      ) : (
                        <div className="space-y-4">
                          {                          group.students.map((student) => (
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

      <div className="flex gap-2 flex-shrink-0">
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Выйти
        </Button>
        <Link href="/tracks">
          <Button variant="ghost">К трекам</Button>
        </Link>
      </div>
    </div>
  );
}

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
            {studentName} — выполненные и невыполненные задания
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : data?.lessons?.length ? (
            <ul className="space-y-2">
              {data.lessons.map((l) => (
                <li
                  key={l.lesson_id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border text-sm",
                    l.status === "completed"
                      ? "bg-green-500/10 border-green-500/30"
                      : l.status === "started"
                        ? "bg-amber-500/10 border-amber-500/30"
                        : "bg-muted/30 border-border/60"
                  )}
                >
                  {l.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : l.status === "started" ? (
                    <CircleDot className="h-4 w-4 shrink-0 text-amber-600" />
                  ) : (
                    <CircleDot className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-medium flex-1 min-w-0 truncate">{l.lesson_title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{l.lesson_type_label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Нет уроков в треке</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
    <div className="border-b bg-muted/20" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Ссылки для QR-кодов учеников</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {expanded && (
      <form onSubmit={handleSave} className="space-y-3 px-3 pb-3 pt-0">
        <div className="grid gap-2 sm:grid-cols-2">
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
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  async function handleResetPassword() {
    setResetting(true);
    try {
      const { username, password } = await resetStudentPassword(student.id);
      setResetPassword(password);
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
    <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
      <div
        className={cn(
          "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors",
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
          <p className="font-medium truncate">{student.full_name}</p>
          <p className="text-xs text-muted-foreground font-mono">{student.username}</p>
        </div>
        <div className="text-right shrink-0 flex items-center gap-2">
          {showCredentials && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                setCredentialsOpen(true);
                setResetPassword(null);
              }}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Учётные данные
            </Button>
          )}
          <div>
            <p className="text-sm font-medium">{avgPercent}%</p>
            <p className="text-xs text-muted-foreground">
              {student.progress.filter((p) => p.percent === 100).length} / {student.progress.length} треков
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
                Логин и пароль для входа ученика {student.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Логин</p>
                <p className="font-mono text-base bg-muted px-3 py-2 rounded-md">{student.username}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Пароль</p>
                {resetPassword ? (
                  <p className="font-mono text-base bg-muted px-3 py-2 rounded-md break-all">{resetPassword}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-2">
                    Пароль хранится в зашифрованном виде. Сбросьте пароль, чтобы получить новый.
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
        <div className="p-3 pt-0 mt-3 space-y-4 border-t border-border/40">
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
                  <span className="text-muted-foreground">
                    {p.completed} / {p.total} ({p.percent}%)
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

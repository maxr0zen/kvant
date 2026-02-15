"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  type GroupItem,
  type CreateGroupPayload,
} from "@/lib/api/groups";
import {
  fetchUsers,
  createUser,
  updateUser,
  type UserListItem,
} from "@/lib/api/users";
import { getStoredRole } from "@/lib/api/auth";
import { useToast } from "@/components/ui/use-toast";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import {
  UsersRound,
  UserPlus,
  GraduationCap,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/components/lib/utils";

export default function AdminGroupsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CreateGroupPayload>({ title: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [addStudentGroupId, setAddStudentGroupId] = useState<string | null>(null);
  const [assignTeachersGroupId, setAssignTeachersGroupId] = useState<string | null>(null);
  const [studentForm, setStudentForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [teacherSelection, setTeacherSelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const role = getStoredRole();
    if (role !== "superuser") {
      router.replace("/main");
      return;
    }
    Promise.all([fetchGroups(), fetchUsers()]).then(([g, u]) => {
      setGroups(g);
      setUsers(u);
    }).finally(() => setLoading(false));
  }, [router]);

  const studentsByGroup = (groupId: string) =>
    users.filter((u) => u.role === "student" && u.group_id === groupId);
  const teachersByGroup = (groupId: string) =>
    users.filter((u) => u.role === "teacher" && (u.group_ids ?? []).includes(groupId));
  const allTeachers = users.filter((u) => u.role === "teacher");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Ошибка", description: "Введите название группы", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const created = await createGroup(form);
      setGroups((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      setForm({ title: "" });
      toast({ title: "Группа создана", description: created.title });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось создать группу",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(g: GroupItem) {
    setEditingId(g.id);
    setEditTitle(g.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
  }

  async function saveEdit() {
    if (!editingId || !editTitle.trim()) return;
    setSubmitting(true);
    try {
      const updated = await updateGroup(editingId, { title: editTitle.trim() });
      setGroups((prev) =>
        prev.map((g) => (g.id === updated.id ? updated : g)).sort((a, b) => a.order - b.order)
      );
      setEditingId(null);
      setEditTitle("");
      toast({ title: "Группа обновлена", description: updated.title });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось обновить группу",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Удалить группу «${title}»?`)) return;
    setSubmitting(true);
    try {
      await deleteGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      toast({ title: "Группа удалена", description: title });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось удалить группу",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openAddStudent(groupId: string) {
    setAddStudentGroupId(groupId);
    setStudentForm({ username: "", first_name: "", last_name: "", password: "" });
  }

  async function submitAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!addStudentGroupId) return;
    if (!studentForm.username.trim() || !studentForm.first_name.trim() || !studentForm.last_name.trim() || !studentForm.password) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }
    if (studentForm.password.length < 6) {
      toast({ title: "Ошибка", description: "Пароль не менее 6 символов", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const created = await createUser({
        username: studentForm.username.trim(),
        first_name: studentForm.first_name.trim(),
        last_name: studentForm.last_name.trim(),
        password: studentForm.password,
        role: "student",
        group_id: addStudentGroupId,
      });
      setUsers((prev) => [created, ...prev]);
      setAddStudentGroupId(null);
      toast({
        title: "Ученик добавлен",
        description: `${created.name || created.username} · логин: ${created.username}`,
      });
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

  function openAssignTeachers(groupId: string) {
    setAssignTeachersGroupId(groupId);
    const current = teachersByGroup(groupId).map((t) => t.id);
    setTeacherSelection(
      allTeachers.reduce((acc, t) => ({ ...acc, [t.id]: current.includes(t.id) }), {})
    );
  }

  async function saveAssignTeachers() {
    if (!assignTeachersGroupId) return;
    setSubmitting(true);
    try {
      for (const teacher of allTeachers) {
        const shouldHave = teacherSelection[teacher.id] ?? false;
        const currentIds = teacher.group_ids ?? [];
        const hasGroup = currentIds.includes(assignTeachersGroupId);
        if (shouldHave && !hasGroup) {
          await updateUser(teacher.id, { group_ids: [...currentIds, assignTeachersGroupId] });
          setUsers((prev) =>
            prev.map((u) =>
              u.id === teacher.id
                ? { ...u, group_ids: [...(u.group_ids ?? []), assignTeachersGroupId] }
                : u
            )
          );
        } else if (!shouldHave && hasGroup) {
          await updateUser(teacher.id, {
            group_ids: currentIds.filter((id) => id !== assignTeachersGroupId),
          });
          setUsers((prev) =>
            prev.map((u) =>
              u.id === teacher.id
                ? { ...u, group_ids: (u.group_ids ?? []).filter((id) => id !== assignTeachersGroupId) }
                : u
            )
          );
        }
      }
      setAssignTeachersGroupId(null);
      toast({ title: "Учителя назначены" });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось сохранить",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (typeof window !== "undefined" && getStoredRole() !== "superuser") {
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Группы"
        description="Создавайте группы, назначайте учителей и добавляйте учеников."
        breadcrumbs={[{ label: "Треки", href: "/main" }, { label: "Группы" }]}
      />

      <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UsersRound className="h-5 w-5 text-primary" />
            Новая группа
          </CardTitle>
          <CardDescription>Создайте учебную группу, затем добавьте учеников и назначьте учителей</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <Label htmlFor="group-title">Название группы</Label>
              <Input
                id="group-title"
                placeholder="Например: 10-А, 5-Б"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={submitting}
                className="bg-background/50"
              />
            </div>
            <Button type="submit" disabled={submitting} className="shadow-sm">
              {submitting ? "Создание..." : "Создать группу"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <ListSkeleton rows={4} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Нет групп"
          description="Создайте первую группу выше."
          className="py-12 rounded-xl border-2 border-dashed"
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground/90">Все группы</h2>
          <div className="grid gap-4">
            {groups.map((g) => {
              const expanded = expandedGroupId === g.id;
              const students = studentsByGroup(g.id);
              const teachers = teachersByGroup(g.id);
              return (
                <Card
                  key={g.id}
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    expanded && "ring-2 ring-primary/30 shadow-md"
                  )}
                >
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedGroupId((id) => (id === g.id ? null : g.id))}
                  >
                    {expanded ? (
                      <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      {editingId === g.id ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-9 max-w-[240px] font-medium"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="font-semibold text-foreground">{g.title}</span>
                      )}
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {students.length} учеников · {teachers.length} учителей
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {editingId === g.id ? (
                        <>
                          <Button size="sm" onClick={saveEdit} disabled={submitting}>
                            Сохранить
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            Отмена
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(g);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Изменить
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(g.id, g.title);
                            }}
                            disabled={submitting}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Удалить
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {expanded && (
                    <CardContent className="pt-0 pb-4 border-t bg-muted/20">
                      <div className="grid gap-6 sm:grid-cols-2 pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-primary" />
                              Ученики
                            </h3>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => openAddStudent(g.id)}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              Добавить
                            </Button>
                          </div>
                          {students.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">
                              Пока нет учеников в группе
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {students.map((s) => (
                                <li
                                  key={s.id}
                                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md bg-background/60"
                                >
                                  <span className="font-medium truncate">{s.name || s.username}</span>
                                  <Link
                                    href="/admin/users"
                                    className="text-xs text-muted-foreground hover:text-primary font-mono truncate ml-2"
                                  >
                                    {s.username}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                              <UsersRound className="h-4 w-4 text-primary" />
                              Учителя
                            </h3>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => openAssignTeachers(g.id)}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              Назначить
                            </Button>
                          </div>
                          {teachers.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">
                              Учителя не назначены
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {teachers.map((t) => (
                                <li
                                  key={t.id}
                                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md bg-background/60"
                                >
                                  <span className="font-medium truncate">{t.name || t.username}</span>
                                  <span className="text-xs text-muted-foreground font-mono">{t.username}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={!!addStudentGroupId} onOpenChange={(open) => !open && setAddStudentGroupId(null)}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Добавить ученика</DialogTitle>
            <DialogDescription>
              Создайте логин и пароль для нового ученика в этой группе
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAddStudent} className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="student-first">Имя</Label>
                <Input
                  id="student-first"
                  placeholder="Иван"
                  value={studentForm.first_name}
                  onChange={(e) => setStudentForm((f) => ({ ...f, first_name: e.target.value }))}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-last">Фамилия</Label>
                <Input
                  id="student-last"
                  placeholder="Иванов"
                  value={studentForm.last_name}
                  onChange={(e) => setStudentForm((f) => ({ ...f, last_name: e.target.value }))}
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-username">Логин</Label>
              <Input
                id="student-username"
                placeholder="ivanov"
                value={studentForm.username}
                onChange={(e) => setStudentForm((f) => ({ ...f, username: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-password">Пароль</Label>
              <Input
                id="student-password"
                type="password"
                placeholder="Не менее 6 символов"
                value={studentForm.password}
                onChange={(e) => setStudentForm((f) => ({ ...f, password: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddStudentGroupId(null)}>
                Отмена
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Создание..." : "Создать ученика"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignTeachersGroupId} onOpenChange={(open) => !open && setAssignTeachersGroupId(null)}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Назначить учителей</DialogTitle>
            <DialogDescription>
              Отметьте учителей, которые ведут эту группу
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 max-h-[60vh] overflow-y-auto space-y-2">
            {allTeachers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет учителей в системе. Создайте их в разделе «Пользователи».</p>
            ) : (
              allTeachers.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={teacherSelection[t.id] ?? false}
                    onChange={(e) =>
                      setTeacherSelection((prev) => ({ ...prev, [t.id]: e.target.checked }))
                    }
                    className="rounded border-primary"
                  />
                  <span className="font-medium flex-1">{t.name || t.username}</span>
                  <span className="text-sm text-muted-foreground font-mono">{t.username}</span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTeachersGroupId(null)}>
              Отмена
            </Button>
            <Button onClick={saveAssignTeachers} disabled={submitting || allTeachers.length === 0}>
              {submitting ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

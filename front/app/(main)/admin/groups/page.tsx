"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { getStoredRole } from "@/lib/api/auth";
import {
  createGroup,
  deleteGroup,
  fetchGroups,
  updateGroup,
  type GroupItem,
} from "@/lib/api/groups";
import { createUser, fetchUsers, updateUser, type UserListItem } from "@/lib/api/users";
import { useToast } from "@/components/ui/use-toast";
import { GraduationCap, Pencil, Plus, Trash2, UserPlus, UsersRound } from "lucide-react";

export default function AdminGroupsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);
  const [groupTitleDraft, setGroupTitleDraft] = useState("");
  const [studentDialog, setStudentDialog] = useState<{
    groupId: string;
    groupTitle: string;
    username: string;
    first_name: string;
    last_name: string;
    password: string;
  } | null>(null);
  const [teacherDialog, setTeacherDialog] = useState<{ groupId: string; groupTitle: string } | null>(null);
  const [teacherSelection, setTeacherSelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (getStoredRole() !== "superuser") {
      router.replace("/main");
      return;
    }

    Promise.all([fetchGroups(), fetchUsers()])
      .then(([groupsResult, usersResult]) => {
        setGroups(groupsResult);
        setUsers(usersResult);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const teachers = useMemo(() => users.filter((user) => user.role === "teacher"), [users]);

  function studentsByGroup(groupId: string) {
    return users.filter((user) => user.role === "student" && user.group_id === groupId);
  }

  function teachersByGroup(groupId: string) {
    return users.filter((user) => user.role === "teacher" && (user.group_ids ?? []).includes(groupId));
  }

  async function handleCreateGroup() {
    if (!newGroupTitle.trim()) {
      toast({ title: "Введите название группы", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const created = await createGroup({ title: newGroupTitle.trim() });
      setGroups((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      setNewGroupTitle("");
      toast({ title: "Группа создана", description: created.title });
    } catch (error) {
      toast({
        title: "Не удалось создать группу",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveTitle() {
    if (!editingGroup || !groupTitleDraft.trim()) return;
    setSubmitting(true);
    try {
      const updated = await updateGroup(editingGroup.id, { title: groupTitleDraft.trim() });
      setGroups((prev) => prev.map((group) => (group.id === updated.id ? updated : group)));
      setEditingGroup(null);
      setGroupTitleDraft("");
      toast({ title: "Название обновлено", description: updated.title });
    } catch (error) {
      toast({
        title: "Не удалось обновить группу",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGroup(group: GroupItem) {
    if (!confirm(`Удалить группу «${group.title}»?`)) return;
    setSubmitting(true);
    try {
      await deleteGroup(group.id);
      setGroups((prev) => prev.filter((item) => item.id !== group.id));
      toast({ title: "Группа удалена", description: group.title });
    } catch (error) {
      toast({
        title: "Не удалось удалить группу",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateStudent() {
    if (!studentDialog) return;
    if (
      !studentDialog.username.trim() ||
      !studentDialog.first_name.trim() ||
      !studentDialog.last_name.trim() ||
      studentDialog.password.length < 6
    ) {
      toast({
        title: "Проверьте данные ученика",
        description: "Нужны логин, имя, фамилия и пароль не короче 6 символов.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const created = await createUser({
        username: studentDialog.username.trim(),
        first_name: studentDialog.first_name.trim(),
        last_name: studentDialog.last_name.trim(),
        password: studentDialog.password,
        role: "student",
        group_id: studentDialog.groupId,
      });
      setUsers((prev) => [created, ...prev]);
      setStudentDialog(null);
      toast({ title: "Ученик создан", description: created.username });
    } catch (error) {
      toast({
        title: "Не удалось создать ученика",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveTeachers() {
    if (!teacherDialog) return;
    setSubmitting(true);
    try {
      for (const teacher of teachers) {
        const current = teacher.group_ids ?? [];
        const shouldInclude = teacherSelection[teacher.id] ?? false;
        const hasGroup = current.includes(teacherDialog.groupId);
        if (shouldInclude === hasGroup) continue;

        const nextGroupIds = shouldInclude
          ? [...current, teacherDialog.groupId]
          : current.filter((item) => item !== teacherDialog.groupId);

        const updated = await updateUser(teacher.id, { group_ids: nextGroupIds });
        setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      }

      setTeacherDialog(null);
      toast({ title: "Назначения сохранены" });
    } catch (error) {
      toast({
        title: "Не удалось назначить преподавателей",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <ListSkeleton rows={6} className="content-block py-10" />;
  }

  return (
    <div className="content-block space-y-6">
      <PageHeader
        title="Группы"
        description="Управляйте наборами учеников, назначайте преподавателей и держите академическую структуру в аккуратном состоянии."
        breadcrumbs={[{ label: "Главная", href: "/main" }, { label: "Группы" }]}
      />

      <section className="grid gap-4 xl:grid-cols-[0.92fr,1.08fr]">
        <Card className="hero-surface overflow-hidden">
          <CardHeader>
            <CardTitle>Новая учебная группа</CardTitle>
            <CardDescription>
              Создаем группу как полноценную сущность продукта, а не как временную папку.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={newGroupTitle}
              onChange={(event) => setNewGroupTitle(event.target.value)}
              placeholder="Например, KAVNT 8A / Весна 2026"
            />
            <Button onClick={() => void handleCreateGroup()} disabled={submitting} className="gap-2">
              <Plus className="h-4 w-4" />
              Создать группу
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Всего групп</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{groups.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Учеников</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                {users.filter((user) => user.role === "student").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Преподавателей</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{teachers.length}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4">
        {groups.map((group) => {
          const students = studentsByGroup(group.id);
          const assignedTeachers = teachersByGroup(group.id);
          return (
            <Card key={group.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col gap-5 border-b border-border/60 px-5 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="kavnt-badge">Group management</span>
                      <span className="rounded-full border border-border/60 bg-muted/15 px-3 py-1 text-xs text-muted-foreground">
                        Order {group.order}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">{group.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {students.length} учеников · {assignedTeachers.length} преподавателей
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setEditingGroup(group);
                        setGroupTitleDraft(group.title);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Переименовать
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setTeacherDialog({ groupId: group.id, groupTitle: group.title });
                        setTeacherSelection(
                          teachers.reduce<Record<string, boolean>>(
                            (acc, teacher) => ({
                              ...acc,
                              [teacher.id]: (teacher.group_ids ?? []).includes(group.id),
                            }),
                            {}
                          )
                        );
                      }}
                    >
                      <GraduationCap className="h-4 w-4" />
                      Назначить преподавателей
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        setStudentDialog({
                          groupId: group.id,
                          groupTitle: group.title,
                          username: "",
                          first_name: "",
                          last_name: "",
                          password: "",
                        })
                      }
                    >
                      <UserPlus className="h-4 w-4" />
                      Добавить ученика
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleDeleteGroup(group)}>
                      <Trash2 className="h-4 w-4" />
                      Удалить
                    </Button>
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-2">
                  <div className="border-b border-border/60 p-5 lg:border-b-0 lg:border-r lg:p-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <UsersRound className="h-4 w-4 text-primary" />
                      Состав группы
                    </div>
                    <div className="mt-4 grid gap-3">
                      {students.length > 0 ? (
                        students.map((student) => (
                          <div key={student.id} className="rounded-2xl border border-border/60 bg-muted/15 px-4 py-3">
                            <p className="font-medium text-foreground">{student.name || student.username}</p>
                            <p className="text-sm text-muted-foreground">@{student.username}</p>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          icon={UsersRound}
                          title="Пока без учеников"
                          description="Добавьте первого ученика, чтобы группа начала работать как учебная единица."
                        />
                      )}
                    </div>
                  </div>

                  <div className="p-5 lg:p-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      Команда преподавателей
                    </div>
                    <div className="mt-4 grid gap-3">
                      {assignedTeachers.length > 0 ? (
                        assignedTeachers.map((teacher) => (
                          <div key={teacher.id} className="rounded-2xl border border-border/60 bg-muted/15 px-4 py-3">
                            <p className="font-medium text-foreground">{teacher.name || teacher.username}</p>
                            <p className="text-sm text-muted-foreground">@{teacher.username}</p>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          icon={GraduationCap}
                          title="Преподаватели не назначены"
                          description="У группы пока нет ответственного преподавателя."
                        />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {groups.length === 0 && (
          <EmptyState
            icon={UsersRound}
            title="Группы еще не созданы"
            description="Начните со структуры потоков, и дальше можно будет назначать учеников и преподавателей."
          />
        )}
      </section>

      <Dialog open={Boolean(editingGroup)} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать группу</DialogTitle>
            <DialogDescription>Новое название должно быть понятным и человеку, и admin-аналитике.</DialogDescription>
          </DialogHeader>
          <Input value={groupTitleDraft} onChange={(event) => setGroupTitleDraft(event.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>Отмена</Button>
            <Button onClick={() => void handleSaveTitle()} disabled={submitting}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(studentDialog)} onOpenChange={(open) => !open && setStudentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый ученик</DialogTitle>
            <DialogDescription>{studentDialog ? `Группа: ${studentDialog.groupTitle}` : ""}</DialogDescription>
          </DialogHeader>
          {studentDialog ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Логин</label>
                <Input value={studentDialog.username} onChange={(event) => setStudentDialog({ ...studentDialog, username: event.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Имя</label>
                <Input value={studentDialog.first_name} onChange={(event) => setStudentDialog({ ...studentDialog, first_name: event.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Фамилия</label>
                <Input value={studentDialog.last_name} onChange={(event) => setStudentDialog({ ...studentDialog, last_name: event.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Пароль</label>
                <Input type="password" value={studentDialog.password} onChange={(event) => setStudentDialog({ ...studentDialog, password: event.target.value })} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialog(null)}>Отмена</Button>
            <Button onClick={() => void handleCreateStudent()} disabled={submitting}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(teacherDialog)} onOpenChange={(open) => !open && setTeacherDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Назначить преподавателей</DialogTitle>
            <DialogDescription>{teacherDialog ? `Группа: ${teacherDialog.groupTitle}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {teachers.map((teacher) => (
              <label key={teacher.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/15 px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{teacher.name || teacher.username}</p>
                  <p className="text-sm text-muted-foreground">@{teacher.username}</p>
                </div>
                <input
                  type="checkbox"
                  checked={teacherSelection[teacher.id] ?? false}
                  onChange={(event) => setTeacherSelection((prev) => ({ ...prev, [teacher.id]: event.target.checked }))}
                  className="h-4 w-4"
                />
              </label>
            ))}
            {teachers.length === 0 && (
              <EmptyState
                icon={GraduationCap}
                title="Преподаватели не найдены"
                description="Сначала создайте преподавателей на странице пользователей."
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeacherDialog(null)}>Отмена</Button>
            <Button onClick={() => void handleSaveTeachers()} disabled={submitting}>Сохранить назначения</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

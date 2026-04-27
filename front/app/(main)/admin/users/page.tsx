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
  createUser,
  fetchUsers,
  updateUser,
  type CreateUserPayload,
  type UserListItem,
} from "@/lib/api/users";
import { fetchGroups, type GroupItem } from "@/lib/api/groups";
import { useToast } from "@/components/ui/use-toast";
import { Pencil, Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  student: "Ученик",
  teacher: "Преподаватель",
  superuser: "Администратор",
};

function groupTitle(groups: GroupItem[], id: string | null) {
  return groups.find((group) => group.id === id)?.title ?? "Не назначена";
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>({
    username: "",
    name: "",
    password: "",
    role: "student",
    group_id: null,
    group_ids: [],
  });
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editGroupIds, setEditGroupIds] = useState<string[]>([]);

  useEffect(() => {
    if (getStoredRole() !== "superuser") {
      router.replace("/main");
      return;
    }

    Promise.all([fetchUsers(), fetchGroups()])
      .then(([usersResult, groupsResult]) => {
        setUsers(usersResult);
        setGroups(groupsResult);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const summary = useMemo(
    () => ({
      total: users.length,
      students: users.filter((user) => user.role === "student").length,
      teachers: users.filter((user) => user.role === "teacher").length,
    }),
    [users]
  );

  function openEdit(user: UserListItem) {
    setEditingUser(user);
    setEditName(user.name || user.username);
    setEditGroupId(user.group_id);
    setEditGroupIds(user.group_ids ?? []);
  }

  async function handleCreateUser() {
    if (!form.username.trim() || !form.name?.trim() || !form.password || form.password.length < 6) {
      toast({
        title: "Проверьте данные",
        description: "Нужны логин, имя и пароль не короче 6 символов.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateUserPayload = {
        ...form,
        username: form.username.trim(),
        name: form.name?.trim(),
        group_id: form.role === "student" ? form.group_id ?? null : undefined,
        group_ids: form.role === "teacher" ? form.group_ids ?? [] : undefined,
      };
      const created = await createUser(payload);
      setUsers((prev) => [created, ...prev]);
      setForm({
        username: "",
        name: "",
        password: "",
        role: "student",
        group_id: null,
        group_ids: [],
      });
      toast({ title: "Пользователь создан", description: created.username });
    } catch (error) {
      toast({
        title: "Не удалось создать пользователя",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveUser() {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const updated = await updateUser(editingUser.id, {
        name: editName.trim(),
        group_id: editingUser.role === "student" ? editGroupId : null,
        group_ids: editingUser.role === "teacher" ? editGroupIds : [],
      });
      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
      setEditingUser(null);
      toast({ title: "Пользователь обновлен", description: updated.username });
    } catch (error) {
      toast({
        title: "Не удалось обновить пользователя",
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
        title="Пользователи"
        description="Единое место для создания учеников и преподавателей, распределения по группам и поддержания чистой ролевой структуры."
        breadcrumbs={[{ label: "Главная", href: "/main" }, { label: "Пользователи" }]}
      />

      <section className="grid gap-4 xl:grid-cols-[1fr,1fr]">
        <Card className="hero-surface overflow-hidden">
          <CardHeader>
            <CardTitle>Новый пользователь</CardTitle>
            <CardDescription>Создаем account сразу с корректной ролью и базовым назначением.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Логин</label>
              <Input value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Имя</label>
              <Input value={form.name ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Пароль</label>
              <Input type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Роль</label>
              <select
                className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm"
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    role: event.target.value as "student" | "teacher",
                    group_id: event.target.value === "student" ? prev.group_id : null,
                    group_ids: event.target.value === "teacher" ? prev.group_ids ?? [] : [],
                  }))
                }
              >
                <option value="student">Ученик</option>
                <option value="teacher">Преподаватель</option>
              </select>
            </div>

            {form.role === "student" ? (
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Группа</label>
                <select
                  className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm"
                  value={form.group_id ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, group_id: event.target.value || null }))}
                >
                  <option value="">Без группы</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Группы преподавателя</label>
                <div className="grid gap-2 md:grid-cols-2">
                  {groups.map((group) => (
                    <label key={group.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/15 px-4 py-3">
                      <span className="text-sm text-foreground">{group.title}</span>
                      <input
                        type="checkbox"
                        checked={(form.group_ids ?? []).includes(group.id)}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            group_ids: event.target.checked
                              ? [...(prev.group_ids ?? []), group.id]
                              : (prev.group_ids ?? []).filter((item) => item !== group.id),
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <Button onClick={() => void handleCreateUser()} disabled={submitting}>
                Создать пользователя
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Всего</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{summary.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Ученики</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{summary.students}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Преподаватели</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{summary.teachers}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="kavnt-badge">{ROLE_LABELS[user.role] ?? user.role}</span>
                  <span className="rounded-full border border-border/60 bg-muted/15 px-3 py-1 text-xs text-muted-foreground">
                    @{user.username}
                  </span>
                </div>
                <div>
                  <p className="text-xl font-semibold tracking-[-0.03em] text-foreground">{user.name || user.username}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.role === "student"
                      ? `Группа: ${groupTitle(groups, user.group_id)}`
                      : `Группы: ${(user.group_ids ?? []).map((id) => groupTitle(groups, id)).join(", ") || "Не назначены"}`}
                  </p>
                </div>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => openEdit(user)}>
                <Pencil className="h-4 w-4" />
                Редактировать
              </Button>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <EmptyState
            icon={Users}
            title="Пользователей пока нет"
            description="Создайте первого ученика или преподавателя, чтобы собрать рабочую структуру платформы."
          />
        )}
      </section>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактирование пользователя</DialogTitle>
            <DialogDescription>{editingUser ? `Логин: ${editingUser.username}` : ""}</DialogDescription>
          </DialogHeader>

          {editingUser ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Имя</label>
                <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
              </div>

              {editingUser.role === "student" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Группа</label>
                  <select
                    className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm"
                    value={editGroupId ?? ""}
                    onChange={(event) => setEditGroupId(event.target.value || null)}
                  >
                    <option value="">Без группы</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {editingUser.role === "teacher" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Группы преподавателя</label>
                  <div className="grid gap-2">
                    {groups.map((group) => (
                      <label key={group.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/15 px-4 py-3">
                        <span className="text-sm text-foreground">{group.title}</span>
                        <input
                          type="checkbox"
                          checked={editGroupIds.includes(group.id)}
                          onChange={(event) =>
                            setEditGroupIds((prev) =>
                              event.target.checked ? [...prev, group.id] : prev.filter((item) => item !== group.id)
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Отмена</Button>
            <Button onClick={() => void handleSaveUser()} disabled={submitting}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

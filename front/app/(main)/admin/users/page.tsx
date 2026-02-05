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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchUsers,
  createUser,
  updateUser,
  type UserListItem,
  type CreateUserPayload,
} from "@/lib/api/users";
import { fetchGroups, type GroupItem } from "@/lib/api/groups";
import { getStoredRole } from "@/lib/api/auth";
import { useToast } from "@/components/ui/use-toast";

const ROLE_LABELS: Record<string, string> = {
  superuser: "Суперпользователь",
  teacher: "Учитель",
  student: "Ученик",
};

function groupTitleById(groups: GroupItem[], id: string | null): string {
  if (!id) return "—";
  const g = groups.find((x) => x.id === id);
  return g?.title ?? id;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CreateUserPayload>({
    username: "",
    name: "",
    password: "",
    role: "student",
    group_id: null,
    group_ids: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editGroupIds, setEditGroupIds] = useState<string[]>([]);

  useEffect(() => {
    const role = getStoredRole();
    if (role !== "superuser") {
      router.replace("/tracks");
      return;
    }
    Promise.all([fetchUsers(), fetchGroups()]).then(([u, g]) => {
      setUsers(u);
      setGroups(g);
    }).finally(() => setLoading(false));
  }, [router]);

  function openEdit(u: UserListItem) {
    setEditingUser(u);
    setEditName(u.name);
    setEditGroupId(u.group_id ?? null);
    setEditGroupIds(u.group_ids ?? []);
  }

  function closeEdit() {
    setEditingUser(null);
  }

  async function saveEdit() {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const payload =
        editingUser.role === "student"
          ? { name: editName.trim(), group_id: editGroupId, group_ids: [] }
          : { name: editName.trim(), group_id: null, group_ids: editGroupIds };
      const updated = await updateUser(editingUser.id, payload);
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      closeEdit();
      toast({ title: "Пользователь обновлён", description: updated.username });
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось обновить",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function toggleEditGroupId(id: string) {
    setEditGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim() || !form.name.trim() || !form.password) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive",
      });
      return;
    }
    if (form.password.length < 6) {
      toast({
        title: "Ошибка",
        description: "Пароль не менее 6 символов",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateUserPayload = {
        ...form,
        group_id: form.role === "student" ? form.group_id ?? null : undefined,
        group_ids: form.role === "teacher" ? (form.group_ids ?? []) : undefined,
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
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось создать пользователя",
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
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Пользователи</h1>
        <p className="text-muted-foreground mt-1">
          Учителя и ученики. Суперпользователь может добавлять новых.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Добавить пользователя</CardTitle>
          <CardDescription>Укажите логин, имя, пароль, роль и группу (ученик — одна, учитель — несколько)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div className="space-y-2">
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                type="text"
                placeholder="уникальный логин"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                disabled={submitting}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                placeholder="Иван Иванов"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <select
                id="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.role}
                onChange={(e) => {
                  const role = e.target.value as "teacher" | "student";
                  setForm((f) => ({
                    ...f,
                    role,
                    group_id: role === "student" ? f.group_id : null,
                    group_ids: role === "teacher" ? f.group_ids ?? [] : [],
                  }));
                }}
                disabled={submitting}
              >
                <option value="student">Ученик</option>
                <option value="teacher">Учитель</option>
              </select>
            </div>
            {form.role === "student" ? (
              <div className="space-y-2">
                <Label htmlFor="group_id">Группа</Label>
                <select
                  id="group_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.group_id ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, group_id: e.target.value || null }))
                  }
                  disabled={submitting}
                >
                  <option value="">— не выбрана —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Группы (преподаёт)</Label>
                <div className="flex flex-wrap gap-2 min-h-10 items-center rounded-md border border-input bg-background px-3 py-2">
                  {groups.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Нет групп</span>
                  ) : (
                    groups.map((g) => (
                      <label key={g.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form.group_ids ?? []).includes(g.id)}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              group_ids: (f.group_ids ?? []).includes(g.id)
                                ? (f.group_ids ?? []).filter((id) => id !== g.id)
                                : [...(f.group_ids ?? []), g.id],
                            }))
                          }
                          disabled={submitting}
                          className="rounded border-input"
                        />
                        {g.title}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Создание..." : "Добавить"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {editingUser && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Редактировать: {editingUser.username}</CardTitle>
            <CardDescription>
              {editingUser.role === "student"
                ? "Имя и группа (одна)"
                : "Имя и группы, в которых преподаёт"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-xs">
              <Label>Имя</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={submitting}
              />
            </div>
            {editingUser.role === "student" ? (
              <div className="space-y-2 max-w-xs">
                <Label>Группа</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editGroupId ?? ""}
                  onChange={(e) => setEditGroupId(e.target.value || null)}
                  disabled={submitting}
                >
                  <option value="">— не выбрана —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Группы (преподаёт)</Label>
                <div className="flex flex-wrap gap-3">
                  {groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editGroupIds.includes(g.id)}
                        onChange={() => toggleEditGroupId(g.id)}
                        disabled={submitting}
                        className="rounded border-input"
                      />
                      {g.title}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={saveEdit} disabled={submitting}>
                Сохранить
              </Button>
              <Button variant="ghost" onClick={closeEdit}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
          <CardDescription>Учителя и ученики. Нажмите «Изменить» для редактирования группы.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Загрузка...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm">Нет пользователей</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Логин</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Группа / Группы</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{ROLE_LABELS[u.role] ?? u.role}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.role === "student"
                        ? groupTitleById(groups, u.group_id ?? null)
                        : (u.group_ids ?? []).map((id) => groupTitleById(groups, id)).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.created_at ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(u)}
                        disabled={!!editingUser}
                      >
                        Изменить
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="pt-2 flex gap-2">
        <Link href="/admin/groups">
          <Button variant="ghost">Группы</Button>
        </Link>
        <Link href="/tracks">
          <Button variant="ghost">К трекам</Button>
        </Link>
      </div>
    </div>
  );
}

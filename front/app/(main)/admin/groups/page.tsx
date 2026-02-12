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
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  type GroupItem,
  type CreateGroupPayload,
} from "@/lib/api/groups";
import { getStoredRole } from "@/lib/api/auth";
import { useToast } from "@/components/ui/use-toast";

export default function AdminGroupsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CreateGroupPayload>({ title: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const role = getStoredRole();
    if (role !== "superuser") {
      router.replace("/main");
      return;
    }
    fetchGroups()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название группы",
        variant: "destructive",
      });
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

  if (typeof window !== "undefined" && getStoredRole() !== "superuser") {
    return null;
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Группы</h1>
        <p className="text-muted-foreground mt-1">
          Учебные группы. Ученик привязан к одной группе, учитель — к нескольким.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Добавить группу</CardTitle>
          <CardDescription>Введите название группы</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label htmlFor="group-title">Название</Label>
              <Input
                id="group-title"
                placeholder="Например: 10-А"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Создание..." : "Добавить"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Список групп</CardTitle>
          <CardDescription>Все группы платформы</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Загрузка...</p>
          ) : groups.length === 0 ? (
            <p className="text-muted-foreground text-sm">Нет групп</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Порядок</TableHead>
                  <TableHead className="w-[180px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      {editingId === g.id ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-8 max-w-[200px]"
                          autoFocus
                        />
                      ) : (
                        g.title
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{g.order}</TableCell>
                    <TableCell>
                      {editingId === g.id ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit} disabled={submitting}>
                            Сохранить
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            Отмена
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(g)}>
                            Изменить
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(g.id, g.title)}
                            disabled={submitting}
                          >
                            Удалить
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="pt-2 flex gap-2">
        <Link href="/admin/users">
          <Button variant="ghost">Пользователи</Button>
        </Link>
        <Link href="/main">
          <Button variant="ghost">К трекам</Button>
        </Link>
      </div>
    </div>
  );
}

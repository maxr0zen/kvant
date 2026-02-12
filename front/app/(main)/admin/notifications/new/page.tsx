"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchGroups, type GroupItem } from "@/lib/api/groups";
import {
  fetchNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  type Notification,
  type NotificationLevel,
} from "@/lib/api/notifications";
import { getStoredRole } from "@/lib/api/auth";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { Bell, ArrowLeft, Pencil, Trash2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/lib/utils";

const LEVELS: { value: NotificationLevel; label: string }[] = [
  { value: "info", label: "Информация" },
  { value: "success", label: "Успех" },
  { value: "warning", label: "Внимание" },
  { value: "error", label: "Ошибка" },
];

const LEVEL_STYLES: Record<NotificationLevel, string> = {
  info: "border-l-blue-500 bg-blue-500/5",
  success: "border-l-green-500 bg-green-500/5",
  warning: "border-l-amber-500 bg-amber-500/5",
  error: "border-l-red-500 bg-red-500/5",
};

const LEVEL_LABELS: Record<NotificationLevel, string> = {
  info: "Информация",
  success: "Успех",
  warning: "Внимание",
  error: "Ошибка",
};

export default function NewNotificationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<NotificationLevel>("info");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeMode, setTimeMode] = useState<"none" | "until_date" | "duration">("none");
  const [availableUntil, setAvailableUntil] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours" | "days">("hours");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const role = getStoredRole();
    if (role !== "teacher" && role !== "superuser") {
      router.replace("/main");
      return;
    }
    Promise.all([fetchGroups(), fetchNotifications()])
      .then(([gs, ns]) => {
        setGroups(gs);
        setNotifications(ns);
      })
      .finally(() => setLoading(false));
  }, [router]);

  function resetForm() {
    setMessage("");
    setLevel("info");
    setSelectedGroupIds([]);
    setSendToAll(true);
    setTimeMode("none");
    setAvailableUntil("");
    setDurationValue("");
    setDurationUnit("hours");
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите текст уведомления",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload: Parameters<typeof createNotification>[0] = {
        message: message.trim(),
        group_ids: sendToAll ? [] : selectedGroupIds,
        level,
      };
      if (timeMode === "until_date" && availableUntil.trim()) {
        payload.available_until = datetimeLocalToISOUTC(availableUntil.trim());
      } else if (timeMode === "duration" && durationValue.trim()) {
        const num = parseInt(durationValue, 10);
        if (!Number.isNaN(num) && num > 0) {
          const minutes =
            durationUnit === "minutes" ? num : durationUnit === "hours" ? num * 60 : num * 24 * 60;
          payload.duration_minutes = minutes;
        }
      }
      if (editingId) {
        await updateNotification(editingId, payload);
        toast({ title: "Уведомление обновлено" });
      } else {
        await createNotification(payload);
        toast({ title: "Уведомление создано", description: "Оно отобразится на главной у выбранных групп." });
      }
      const ns = await fetchNotifications();
      setNotifications(ns);
      resetForm();
      router.push("/main");
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось создать уведомление",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Clock className="h-8 w-8 animate-pulse" />
          <p className="text-sm">Загрузка…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-2xl mx-auto">
      {/* Шапка */}
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <Link href="/main">
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2 flex-wrap">
              <Bell className="h-6 w-6 text-primary shrink-0" />
              {editingId ? "Редактировать уведомление" : "Создать уведомление"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Уведомление появится над треками на главной у выбранных групп.
            </p>
          </div>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Отмена
            </Button>
          )}
        </div>
      </header>

      {/* Форма */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Текст и аудитория</CardTitle>
            <CardDescription>Сообщение, тип отображения и кому показывать (всем или выбранным группам).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="message">Текст уведомления</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Например: Завтра консультация в 15:00."
                rows={4}
                className="resize-none rounded-lg"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{message.length} / 2000</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Тип</Label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as NotificationLevel)}
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Кому показать</Label>
                <div className="flex flex-col gap-2 pt-0.5">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      checked={sendToAll}
                      onChange={() => setSendToAll(true)}
                      className="rounded-full border-input"
                    />
                    Всем группам
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="audience"
                      checked={!sendToAll}
                      onChange={() => setSendToAll(false)}
                      className="rounded-full border-input"
                    />
                    Выбранным группам
                  </label>
                </div>
                {!sendToAll && groups.length > 0 && (
                  <div className="pl-5 flex flex-wrap gap-3 pt-1">
                    {groups.map((g) => (
                      <label
                        key={g.id}
                        className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(g.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupIds((prev) => [...prev, g.id]);
                            } else {
                              setSelectedGroupIds((prev) => prev.filter((id) => id !== g.id));
                            }
                          }}
                          className="rounded border-input"
                        />
                        {g.title}
                      </label>
                    ))}
                  </div>
                )}
                {!sendToAll && groups.length === 0 && (
                  <p className="text-sm text-muted-foreground pl-5">Нет доступных групп.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Время показа
            </CardTitle>
            <CardDescription>Без ограничения, до указанной даты или в течение заданного времени.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/50">
                <input
                  type="radio"
                  name="timeMode"
                  checked={timeMode === "none"}
                  onChange={() => setTimeMode("none")}
                  className="rounded-full border-input"
                />
                Без ограничения
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/50">
                <input
                  type="radio"
                  name="timeMode"
                  checked={timeMode === "until_date"}
                  onChange={() => setTimeMode("until_date")}
                  className="rounded-full border-input"
                />
                До даты и времени
              </label>
              {timeMode === "until_date" && (
                <div className="pl-6 pt-1">
                  <Input
                    type="datetime-local"
                    value={availableUntil}
                    onChange={(e) => setAvailableUntil(e.target.value)}
                    className="text-sm h-9 w-full max-w-xs rounded-lg"
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/50">
                <input
                  type="radio"
                  name="timeMode"
                  checked={timeMode === "duration"}
                  onChange={() => setTimeMode("duration")}
                  className="rounded-full border-input"
                />
                Показывать в течение
              </label>
              {timeMode === "duration" && (
                <div className="pl-6 flex items-center gap-2 pt-1 flex-wrap">
                  <Input
                    type="number"
                    min={1}
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    placeholder="1"
                    className="text-sm h-9 w-20 rounded-lg"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as "minutes" | "hours" | "days")}
                    className="flex h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="minutes">минут</option>
                    <option value="hours">часов</option>
                    <option value="days">дней</option>
                  </select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={submitting} className="min-w-[180px] rounded-lg">
            {submitting ? "Сохранение…" : editingId ? "Сохранить изменения" : "Создать уведомление"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm} className="rounded-lg">
              Отмена
            </Button>
          )}
        </div>
      </form>

      {/* Список текущих уведомлений */}
      <section>
        <Card className="border-primary/10 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Текущие уведомления</CardTitle>
            <CardDescription>Активные уведомления, видимые вашим группам. Редактируйте или удаляйте при необходимости.</CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 py-10 text-center">
                <Bell className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">Пока нет активных уведомлений</p>
                <p className="text-xs text-muted-foreground mt-0.5">Создайте первое выше</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "rounded-lg border border-l-4 border-border/60 pl-4 pr-4 py-3 transition-colors",
                      LEVEL_STYLES[n.level]
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                              n.level === "info" && "bg-blue-500/15 text-blue-700 dark:text-blue-300",
                              n.level === "success" && "bg-green-500/15 text-green-700 dark:text-green-300",
                              n.level === "warning" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                              n.level === "error" && "bg-red-500/15 text-red-700 dark:text-red-300"
                            )}
                          >
                            {LEVEL_LABELS[n.level]}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{n.message}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setEditingId(n.id);
                            setMessage(n.message);
                            setLevel(n.level);
                            const isAll = (n.group_ids ?? []).length === 0;
                            setSendToAll(isAll);
                            setSelectedGroupIds(isAll ? [] : n.group_ids ?? []);
                            setTimeMode("none");
                            setAvailableUntil("");
                            setDurationValue("");
                            setDurationUnit("hours");
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Редактировать
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            try {
                              await deleteNotification(n.id);
                              const ns = await fetchNotifications();
                              setNotifications(ns);
                              if (editingId === n.id) {
                                resetForm();
                              }
                              toast({ title: "Уведомление удалено" });
                            } catch (err) {
                              toast({
                                title: "Ошибка",
                                description: String(err),
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

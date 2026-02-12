"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { CodeEditor } from "@/components/editor/code-editor";
import { fetchTaskById, updateTask } from "@/lib/api/tasks";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import type { TestCase } from "@/lib/types";
import { Settings2, Trash2, Plus } from "lucide-react";

const defaultTestCase: TestCase = {
  id: "1",
  input: "",
  expectedOutput: "",
  isPublic: true,
};

function toDatetimeLocal(iso: string | undefined | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export default function EditTaskPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starterCode, setStarterCode] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [tempMode, setTempMode] = useState<"none" | "until_date" | "duration">("none");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");
  const [hard, setHard] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    fetchTaskById(id).then((task) => {
      if (cancelled || !task) return;
      if (!task.canEdit) {
        router.replace(`/tasks/${id}`);
        return;
      }
      setTitle(task.title);
      setDescription(task.description ?? "");
      setStarterCode(task.starterCode ?? "");
      setTestCases(
        (task.testCases ?? []).length > 0
          ? task.testCases!.map((tc) => ({
              id: tc.id,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isPublic: tc.isPublic !== false,
            }))
          : [{ ...defaultTestCase, id: "1" }]
      );
      setVisibleGroupIds(task.visibleGroupIds ?? []);
      setHints((task.hints ?? []).length > 0 ? task.hints! : [""]);
      setAvailableFrom(toDatetimeLocal(task.availableFrom));
      setAvailableUntil(toDatetimeLocal(task.availableUntil));
      setTempMode(
        task.availableUntil ? "until_date" : task.availableFrom ? "until_date" : "none"
      );
      setDurationHours("");
      setDurationMinutes("");
      setMaxAttempts(task.maxAttempts != null ? String(task.maxAttempts) : "");
      setHard(task.hard ?? false);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, router]);

  function addTestCase() {
    setTestCases((prev) => [
      ...prev,
      { ...defaultTestCase, id: String(Date.now()) },
    ]);
  }

  function updateTestCase(tcId: string, patch: Partial<TestCase>) {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === tcId ? { ...tc, ...patch } : tc))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !id) return;
    setSaving(true);
    try {
      await updateTask(id, {
        title: title.trim(),
        description: description.trim(),
        starterCode,
        testCases,
        visibleGroupIds: visibleGroupIds.length > 0 ? visibleGroupIds : [],
        hard,
        hints: hints.filter((h) => h.trim()).length > 0 ? hints.filter((h) => h.trim()) : [],
        availableFrom:
          tempMode === "none"
            ? undefined
            : tempMode === "duration"
              ? new Date().toISOString()
              : (availableFrom.trim() ? datetimeLocalToISOUTC(availableFrom.trim()) : undefined),
        availableUntil:
          tempMode === "none"
            ? undefined
            : tempMode === "duration"
              ? new Date(
                  Date.now() +
                    (parseInt(durationHours, 10) || 0) * 3600000 +
                    (parseInt(durationMinutes, 10) || 0) * 60000
                ).toISOString()
              : (availableUntil.trim() ? datetimeLocalToISOUTC(availableUntil.trim()) : undefined),
        maxAttempts: maxAttempts.trim() ? parseInt(maxAttempts, 10) : undefined,
      });
      toast({ title: "Задача сохранена", description: title });
      router.push(`/tasks/${id}`);
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось сохранить",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Редактирование задачи</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Измените поля и нажмите «Сохранить».
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg">Основное</CardTitle>
                <CardDescription className="text-sm">Название и описание задачи</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Дополнительное
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Дополнительное</DialogTitle>
                    <CardDescription className="text-sm">
                      Группы, подсказки, сроки, ограничение попыток, сложность
                    </CardDescription>
                  </DialogHeader>
                  <div className="space-y-5 pt-2">
                    <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
                    <div className="space-y-2">
                      <Label>Подсказки</Label>
                      {hints.map((h, i) => (
                        <div key={i} className="flex gap-2">
                          <Textarea
                            value={h}
                            onChange={(e) => setHints((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                            placeholder={`Подсказка ${i + 1}`}
                            rows={2}
                            className="flex-1 text-sm"
                          />
                          <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setHints((prev) => prev.filter((_, j) => j !== i))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => setHints((prev) => [...prev, ""])}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Добавить подсказку
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Временное задание</Label>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" name="tempMode" checked={tempMode === "none"} onChange={() => setTempMode("none")} className="rounded" />
                          Всегда доступно
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" name="tempMode" checked={tempMode === "until_date"} onChange={() => setTempMode("until_date")} className="rounded" />
                          До даты
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" name="tempMode" checked={tempMode === "duration"} onChange={() => setTempMode("duration")} className="rounded" />
                          По длительности
                        </label>
                      </div>
                      {tempMode === "until_date" && (
                        <div className="grid gap-2 sm:grid-cols-2 pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs">Доступно с (UTC)</Label>
                            <Input type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className="text-sm h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Доступно до (UTC)</Label>
                            <Input type="datetime-local" value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} className="text-sm h-9" />
                          </div>
                        </div>
                      )}
                      {tempMode === "duration" && (
                        <div className="flex gap-3 items-end pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs">Часы</Label>
                            <Input type="number" min={0} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} placeholder="0" className="w-20 h-9 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Минуты</Label>
                            <Input type="number" min={0} max={59} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="0" className="w-20 h-9 text-sm" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="maxAttempts">Ограничение попыток</Label>
                      <Input
                        id="maxAttempts"
                        type="number"
                        min={1}
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(e.target.value)}
                        placeholder="Не задано"
                        className="max-w-[140px] h-9 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hard"
                        checked={hard}
                        onChange={(e) => setHard(e.target.checked)}
                        className="rounded border-input"
                      />
                      <Label htmlFor="hard" className="text-sm font-normal cursor-pointer">Повышенная сложность</Label>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-1">
              <Label htmlFor="title" className="text-sm">Название</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" required className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description" className="text-sm">Описание</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Условие" rows={3} className="text-sm" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Шаблон кода</CardTitle>
            <CardDescription className="text-sm">Начальный код для ученика</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <CodeEditor value={starterCode} onChange={setStarterCode} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Тесты</CardTitle>
            <CardDescription className="text-sm">Ввод и ожидаемый вывод</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {testCases.map((tc) => (
              <div key={tc.id} className="rounded-lg border p-4 space-y-2 grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Ввод</Label>
                  <Input value={tc.input} onChange={(e) => updateTestCase(tc.id, { input: e.target.value })} placeholder="Ввод" />
                </div>
                <div className="space-y-1">
                  <Label>Ожидаемый вывод</Label>
                  <Input value={tc.expectedOutput} onChange={(e) => updateTestCase(tc.id, { expectedOutput: e.target.value })} placeholder="Вывод" />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
              Добавить тест
            </Button>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
          <Link href={`/tasks/${id}`}>
            <Button type="button" variant="outline">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

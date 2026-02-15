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
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/loading-skeleton";
import type { TestCase } from "@/lib/types";
import { Trash2, Plus, Settings2 } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";

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
  const [language, setLanguage] = useState("python");
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
      setLanguage(task.language ?? "python");
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
      setHints((task.hints ?? []).length > 0 ? task.hints! : []);
      setAvailableFrom(toDatetimeLocal(task.availableFrom));
      setAvailableUntil(toDatetimeLocal(task.availableUntil));
      setTempMode(
        task.availableUntil ? "until_date" : task.availableFrom ? "until_date" : "none"
      );
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
        language,
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
    return <PageSkeleton cards={2} />;
  }

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <PageHeader
        title="Редактирование задачи"
        description="Измените поля и нажмите «Сохранить»."
        breadcrumbs={[{ label: "Треки", href: "/main" }, { label: "Задача", href: `/tasks/${id}` }, { label: "Редактирование" }]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Основное</CardTitle>
                <CardDescription className="text-sm">Название и описание. Дополнительные настройки — в кнопке справа.</CardDescription>
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
                    <div className="space-y-2 border-t pt-5">
                      <Label>Подсказки</Label>
                      {hints.map((h, i) => (
                        <div key={i} className="flex gap-2">
                          <Textarea value={h} onChange={(e) => setHints((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Подсказка ${i + 1}`} rows={2} className="flex-1 text-sm" />
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => setHints((prev) => prev.filter((_, j) => j !== i))}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => setHints((prev) => [...prev, ""])}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Добавить подсказку
                      </Button>
                    </div>
                    <div className="space-y-2 border-t pt-5">
                      <Label>Временное задание</Label>
                      <div className="flex flex-wrap gap-2">
                        {([{ value: "none", label: "Всегда доступно" }, { value: "until_date", label: "До даты" }, { value: "duration", label: "По длительности" }] as const).map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border py-2 px-3 hover:bg-muted/50 transition-colors">
                            <input type="radio" name="tempMode" checked={tempMode === opt.value} onChange={() => setTempMode(opt.value)} className="rounded-full border-input" />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                      {tempMode === "until_date" && (
                        <div className="grid gap-3 sm:grid-cols-2 pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs">Доступно с (UTC)</Label>
                            <Input type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Доступно до (UTC)</Label>
                            <Input type="datetime-local" value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} className="h-9" />
                          </div>
                        </div>
                      )}
                      {tempMode === "duration" && (
                        <div className="flex gap-3 items-end pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs">Часы</Label>
                            <Input type="number" min={0} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} placeholder="0" className="w-20 h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Минуты</Label>
                            <Input type="number" min={0} max={59} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="0" className="w-20 h-9" />
                          </div>
                          <p className="text-xs text-muted-foreground pb-2">С текущего момента</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 border-t pt-5">
                      <Label htmlFor="maxAttempts">Ограничение попыток</Label>
                      <Input id="maxAttempts" type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="Без ограничения" className="h-9 max-w-[140px]" />
                    </div>
                    <div className="flex items-center gap-2 border-t pt-5">
                      <input type="checkbox" id="hard" checked={hard} onChange={(e) => setHard(e.target.checked)} className="rounded border-input" />
                      <Label htmlFor="hard" className="text-sm font-normal cursor-pointer">Повышенная сложность (&#9733;)</Label>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Название</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Условие" rows={3} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Шаблон кода</CardTitle>
                <CardDescription>Начальный код для ученика</CardDescription>
              </div>
              <LanguageSelector value={language} onChange={setLanguage} className="w-40" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <CodeEditor value={starterCode} onChange={setStarterCode} language={language} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Тесты</CardTitle>
            <CardDescription>Ввод и ожидаемый вывод</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {testCases.map((tc) => (
              <div key={tc.id} className="rounded-lg border p-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Ввод</Label>
                  <Input value={tc.input} onChange={(e) => updateTestCase(tc.id, { input: e.target.value })} placeholder="например: 1 2" className="h-9" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Ожидаемый вывод</Label>
                    {testCases.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setTestCases((prev) => prev.filter((t) => t.id !== tc.id))}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  <Input value={tc.expectedOutput} onChange={(e) => updateTestCase(tc.id, { expectedOutput: e.target.value })} placeholder="например: 3" className="h-9" />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Добавить тест
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving} className="min-w-[140px]">
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

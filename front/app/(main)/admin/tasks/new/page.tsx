"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { createTask } from "@/lib/api/tasks";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import type { TestCase } from "@/lib/types";
import { Settings2, Trash2, Plus, ArrowLeft, Code2 } from "lucide-react";

const defaultTestCase: TestCase = {
  id: "1",
  input: "",
  expectedOutput: "",
  isPublic: true,
};

export default function NewTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trackId = searchParams.get("trackId");
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starterCode, setStarterCode] = useState('print("Hello, World!")');
  const [testCases, setTestCases] = useState<TestCase[]>([
    { ...defaultTestCase, id: "1" },
  ]);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [tempMode, setTempMode] = useState<"none" | "until_date" | "duration">("none");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");
  const [hard, setHard] = useState(false);
  const [loading, setLoading] = useState(false);

  function addTestCase() {
    setTestCases((prev) => [
      ...prev,
      { ...defaultTestCase, id: String(Date.now()) },
    ]);
  }

  function updateTestCase(id: string, patch: Partial<TestCase>) {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, ...patch } : tc))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Ошибка", description: "Введите название задачи", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const task = await createTask({
        title: title.trim(),
        description: description.trim(),
        starterCode,
        testCases,
        trackId: trackId ?? undefined,
        visibleGroupIds: visibleGroupIds.length > 0 ? visibleGroupIds : undefined,
        hard,
        hints: hints.filter((h) => h.trim()).length > 0 ? hints.filter((h) => h.trim()) : undefined,
        availableFrom: (() => {
          if (tempMode === "none") return undefined;
          if (tempMode === "duration") return new Date().toISOString();
          return availableFrom.trim() ? datetimeLocalToISOUTC(availableFrom.trim()) : undefined;
        })(),
        availableUntil: (() => {
          if (tempMode === "none") return undefined;
          if (tempMode === "duration") {
            const h = parseInt(durationHours, 10) || 0;
            const m = parseInt(durationMinutes, 10) || 0;
            return new Date(Date.now() + h * 3600000 + m * 60000).toISOString();
          }
          return availableUntil.trim() ? datetimeLocalToISOUTC(availableUntil.trim()) : undefined;
        })(),
        maxAttempts: maxAttempts.trim() ? parseInt(maxAttempts, 10) : undefined,
      });
      toast({ title: "Задача создана", description: task.title });
      if (trackId) {
        router.push(
          `/main/${trackId}?added=task&id=${encodeURIComponent(task.id)}&title=${encodeURIComponent(task.title)}&type=task`
        );
      } else {
        router.push(`/tasks/${task.id}`);
      }
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось создать задачу",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <Link href={trackId ? `/main/${trackId}` : "/main"}>
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label="Назад">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2 flex-wrap">
              <Code2 className="h-6 w-6 text-primary shrink-0" />
              Создание задачи
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {trackId ? "Задача будет добавлена в трек после сохранения." : "Заполните поля и добавьте тесты для проверки решений."}
            </p>
          </div>
        </div>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-sm border-border/80">
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
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
                  <DialogHeader>
                    <DialogTitle>Дополнительное</DialogTitle>
                    <CardDescription className="text-sm">
                      Группы, подсказки, сроки, ограничение попыток, сложность
                    </CardDescription>
                  </DialogHeader>
                  <div className="space-y-0 pt-2">
                    <div className="pb-5">
                      <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
                    </div>
                    <div className="border-t border-border/60 pt-5 pb-5 space-y-2">
                      <Label>Подсказки</Label>
                      <p className="text-xs text-muted-foreground">Ученик открывает по порядку</p>
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
                    <div className="border-t border-border/60 pt-5 pb-5 space-y-2">
                      <Label>Временное задание</Label>
                      <div className="flex flex-wrap gap-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/60 transition-colors">
                          <input type="radio" name="tempMode" checked={tempMode === "none"} onChange={() => setTempMode("none")} className="rounded-full border-input" />
                          Всегда доступно
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/60 transition-colors">
                          <input type="radio" name="tempMode" checked={tempMode === "until_date"} onChange={() => setTempMode("until_date")} className="rounded-full border-input" />
                          До даты
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/60 transition-colors">
                          <input type="radio" name="tempMode" checked={tempMode === "duration"} onChange={() => setTempMode("duration")} className="rounded-full border-input" />
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
                          <p className="text-xs text-muted-foreground pb-2">Доступно с текущего момента</p>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-border/60 pt-5 space-y-1">
                      <Label htmlFor="maxAttempts">Ограничение попыток</Label>
                      <Input
                        id="maxAttempts"
                        type="number"
                        min={1}
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(e.target.value)}
                        placeholder="Не задано — неограниченно"
                        className="max-w-[140px] h-9 text-sm rounded-lg"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4 border-t border-border/60 mt-5">
                      <input
                        type="checkbox"
                        id="hard"
                        checked={hard}
                        onChange={(e) => setHard(e.target.checked)}
                        className="rounded border-input"
                      />
                      <Label htmlFor="hard" className="text-sm font-normal cursor-pointer">Повышенная сложность (звёздочка)</Label>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Название</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Сумма двух чисел"
                required
                className="h-9 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Условие задачи для ученика"
                rows={3}
                className="text-sm rounded-lg resize-y min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Шаблон кода</CardTitle>
            <CardDescription className="text-sm">Начальный код для ученика</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="rounded-lg border overflow-hidden bg-muted/20">
              <CodeEditor value={starterCode} onChange={setStarterCode} />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Тесты</CardTitle>
            <CardDescription className="text-sm">Ввод и ожидаемый вывод для каждого теста</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {testCases.map((tc) => (
              <div
                key={tc.id}
                className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2 grid gap-3 sm:grid-cols-2 transition-colors hover:bg-muted/30"
              >
                <div className="space-y-1">
                  <Label>Ввод</Label>
                  <Input
                    value={tc.input}
                    onChange={(e) => updateTestCase(tc.id, { input: e.target.value })}
                    placeholder="например: 1 2"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ожидаемый вывод</Label>
                  <Input
                    value={tc.expectedOutput}
                    onChange={(e) =>
                      updateTestCase(tc.id, { expectedOutput: e.target.value })
                    }
                    placeholder="например: 3"
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTestCase} className="rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              Добавить тест
            </Button>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={loading} className="rounded-lg min-w-[160px]">
            {loading ? "Создание…" : "Создать задачу"}
          </Button>
          <Link href="/main">
            <Button type="button" variant="outline" className="rounded-lg">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

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
import { PageHeader } from "@/components/ui/page-header";
import type { TestCase } from "@/lib/types";
import { Trash2, Plus, Settings2 } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";

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
  const [language, setLanguage] = useState("python");
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
        language,
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

  const breadcrumbs = trackId
    ? [{ label: "Треки", href: "/main" }, { label: "Трек", href: `/main/${trackId}` }, { label: "Новая задача" }]
    : [{ label: "Треки", href: "/main" }, { label: "Новая задача" }];

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <PageHeader
        title="Создание задачи"
        description={trackId ? "Задача будет добавлена в трек после сохранения." : "Заполните поля и добавьте тесты."}
        breadcrumbs={breadcrumbs}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основное */}
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
                        {[
                          { value: "none", label: "Всегда доступно" },
                          { value: "until_date", label: "До даты" },
                          { value: "duration", label: "По длительности" },
                        ].map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border py-2 px-3 hover:bg-muted/50 transition-colors">
                            <input type="radio" name="tempMode" checked={tempMode === opt.value} onChange={() => setTempMode(opt.value as "none" | "until_date" | "duration")} className="rounded-full border-input" />
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
                    <div className="space-y-2 border-t pt-5">
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
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Сумма двух чисел"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Условие задачи для ученика"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Шаблон кода */}
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

        {/* Тесты */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Тесты</CardTitle>
            <CardDescription>Ввод и ожидаемый вывод для каждого теста</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {testCases.map((tc, idx) => (
              <div
                key={tc.id}
                className="rounded-lg border p-3 space-y-2 grid gap-3 sm:grid-cols-2"
              >
                <div className="space-y-1">
                  <Label className="text-xs">Ввод</Label>
                  <Input
                    value={tc.input}
                    onChange={(e) => updateTestCase(tc.id, { input: e.target.value })}
                    placeholder="например: 1 2"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Ожидаемый вывод</Label>
                    {testCases.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setTestCases((prev) => prev.filter((t) => t.id !== tc.id))}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  <Input
                    value={tc.expectedOutput}
                    onChange={(e) =>
                      updateTestCase(tc.id, { expectedOutput: e.target.value })
                    }
                    placeholder="например: 3"
                    className="h-9"
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Добавить тест
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="min-w-[160px]">
            {loading ? "Создание..." : "Создать задачу"}
          </Button>
          <Link href={trackId ? `/main/${trackId}` : "/main"}>
            <Button type="button" variant="outline">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

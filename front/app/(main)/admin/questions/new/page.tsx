"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createQuestion } from "@/lib/api/questions";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import { PageHeader } from "@/components/ui/page-header";
import type { QuestionChoice } from "@/lib/types";
import { Plus, Trash2, Settings2 } from "lucide-react";

export default function NewQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trackId = searchParams.get("trackId");
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [choices, setChoices] = useState<QuestionChoice[]>([
    { id: "1", text: "", isCorrect: false },
    { id: "2", text: "", isCorrect: false },
  ]);
  const [multiple, setMultiple] = useState(false);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [tempMode, setTempMode] = useState<"none" | "until_date">("none");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");
  const [loading, setLoading] = useState(false);

  function addChoice() {
    setChoices((prev) => [...prev, { id: String(Date.now()), text: "", isCorrect: false }]);
  }

  function removeChoice(index: number) {
    setChoices((prev) => prev.filter((_, i) => i !== index));
  }

  function updateChoice(index: number, patch: Partial<QuestionChoice>) {
    setChoices((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Ошибка", description: "Введите название вопроса", variant: "destructive" });
      return;
    }
    const validChoices = choices.filter((c) => c.text.trim());
    if (validChoices.length < 2) {
      toast({ title: "Ошибка", description: "Добавьте минимум 2 варианта ответа", variant: "destructive" });
      return;
    }
    const hasCorrect = validChoices.some((c) => c.isCorrect);
    if (!hasCorrect) {
      toast({ title: "Ошибка", description: "Отметьте хотя бы один правильный ответ", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const question = await createQuestion({
        title: title.trim(),
        prompt: prompt.trim(),
        choices: validChoices.map((c) => ({ id: c.id, text: c.text.trim(), isCorrect: c.isCorrect ?? false })),
        multiple,
        trackId: trackId ?? undefined,
        visibleGroupIds: visibleGroupIds.length > 0 ? visibleGroupIds : undefined,
        hints: hints.filter((h) => h.trim()).length > 0 ? hints.filter((h) => h.trim()) : undefined,
        availableFrom: tempMode === "until_date" && availableFrom.trim() ? datetimeLocalToISOUTC(availableFrom.trim()) : undefined,
        availableUntil: tempMode === "until_date" && availableUntil.trim() ? datetimeLocalToISOUTC(availableUntil.trim()) : undefined,
        maxAttempts: maxAttempts.trim() ? parseInt(maxAttempts, 10) : undefined,
      });
      toast({ title: "Вопрос создан", description: question.title });
      if (trackId) {
        router.push(
          `/main/${trackId}?added=question&id=${encodeURIComponent(question.id)}&title=${encodeURIComponent(question.title)}&type=question`
        );
      } else {
        router.push(`/questions/${question.id}`);
      }
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось создать вопрос",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const breadcrumbs = trackId
    ? [{ label: "Треки", href: "/main" }, { label: "Трек", href: `/main/${trackId}` }, { label: "Новый вопрос" }]
    : [{ label: "Треки", href: "/main" }, { label: "Новый вопрос" }];

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <PageHeader
        title="Создание вопроса"
        description={trackId ? "Вопрос будет добавлен в трек после сохранения." : "Заполните формулировку и варианты ответа."}
        breadcrumbs={breadcrumbs}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основное */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Основное</CardTitle>
                <CardDescription className="text-sm">Название, формулировка, варианты ответа. Дополнительные настройки — в кнопке справа.</CardDescription>
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
                      Группы, подсказки, сроки, ограничение попыток
                    </CardDescription>
                  </DialogHeader>
                  <div className="space-y-5 pt-2">
                    <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
                    <div className="space-y-2 border-t pt-5">
                      <Label>Временное задание</Label>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border py-2 px-3 hover:bg-muted/50 transition-colors">
                          <input type="radio" name="tempMode" checked={tempMode === "none"} onChange={() => setTempMode("none")} className="rounded-full border-input" />
                          Всегда доступно
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border py-2 px-3 hover:bg-muted/50 transition-colors">
                          <input type="radio" name="tempMode" checked={tempMode === "until_date"} onChange={() => setTempMode("until_date")} className="rounded-full border-input" />
                          До даты
                        </label>
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
                    </div>
                    <div className="space-y-2 border-t pt-5">
                      <Label>Подсказки</Label>
                      <p className="text-xs text-muted-foreground">Ученик открывает по порядку</p>
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
                    <div className="space-y-1 border-t pt-5">
                      <Label htmlFor="maxAttempts">Ограничение попыток</Label>
                      <Input id="maxAttempts" type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="Без ограничения" className="h-9 max-w-[140px]" />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr,auto] items-end">
              <div className="space-y-2">
                <Label htmlFor="title">Название</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" required />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap rounded-lg border py-2 px-3 h-10 hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  id="multiple"
                  checked={multiple}
                  onChange={(e) => setMultiple(e.target.checked)}
                  className="rounded border-input"
                />
                Несколько ответов
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Формулировка вопроса</Label>
              <Textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Текст вопроса" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Варианты ответа</Label>
              <p className="text-xs text-muted-foreground">Отметьте правильные ответы</p>
              {choices.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg border p-3">
                  <input
                    type="checkbox"
                    checked={c.isCorrect ?? false}
                    onChange={(e) => updateChoice(i, { isCorrect: e.target.checked })}
                    className="rounded border-input shrink-0"
                  />
                  <Input
                    value={c.text}
                    onChange={(e) => updateChoice(i, { text: e.target.value })}
                    placeholder="Текст варианта"
                    className="flex-1 min-w-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => removeChoice(i)}
                    disabled={choices.length <= 2}
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addChoice}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Добавить вариант
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="min-w-[140px]">
            {loading ? "Создание..." : "Создать вопрос"}
          </Button>
          <Link href={trackId ? `/main/${trackId}` : "/main"}>
            <Button type="button" variant="outline">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

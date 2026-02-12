"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createQuestion } from "@/lib/api/questions";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import type { QuestionChoice } from "@/lib/types";
import { ArrowLeft, HelpCircle, Plus, Trash2 } from "lucide-react";

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
        availableFrom: availableFrom.trim() ? datetimeLocalToISOUTC(availableFrom.trim()) : undefined,
        availableUntil: availableUntil.trim() ? datetimeLocalToISOUTC(availableUntil.trim()) : undefined,
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
              <HelpCircle className="h-6 w-6 text-primary shrink-0" />
              Создание вопроса
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {trackId
                ? "Вопрос будет добавлен в трек после сохранения."
                : "Заполните формулировку и варианты ответа. Отметьте правильные ответы."}
            </p>
          </div>
        </div>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-sm border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Основное</CardTitle>
            <CardDescription className="text-sm">Название, формулировка, варианты ответа</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-1">
              <Label htmlFor="title">Название</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" required className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prompt">Формулировка вопроса</Label>
              <Textarea id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Текст вопроса" rows={3} className="text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="multiple"
                checked={multiple}
                onChange={(e) => setMultiple(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="multiple" className="text-sm font-normal cursor-pointer">Несколько правильных ответов</Label>
            </div>
            <div className="space-y-2">
              <Label>Варианты ответа</Label>
              <p className="text-xs text-muted-foreground">Отметьте правильные ответы</p>
              {choices.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2 rounded border p-2">
                  <input
                    type="checkbox"
                    checked={c.isCorrect ?? false}
                    onChange={(e) => updateChoice(i, { isCorrect: e.target.checked })}
                    className="rounded border-input"
                  />
                  <Input
                    value={c.text}
                    onChange={(e) => updateChoice(i, { text: e.target.value })}
                    placeholder="Текст варианта"
                    className="flex-1 h-9"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeChoice(i)} disabled={choices.length <= 2} title="Удалить">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addChoice} className="gap-1">
                <Plus className="h-4 w-4" />
                Добавить вариант
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Область видимости</Label>
              <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Доступно с / до (UTC)</Label>
              <div className="flex gap-2 flex-wrap">
                <Input type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className="text-sm h-9 w-48" />
                <Input type="datetime-local" value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} className="text-sm h-9 w-48" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Подсказки</Label>
              {hints.map((h, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <Textarea value={h} onChange={(e) => setHints((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))} rows={1} className="text-sm flex-1" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setHints((prev) => prev.filter((_, j) => j !== i))}>×</Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setHints((prev) => [...prev, ""])}>Добавить подсказку</Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxAttempts">Ограничение попыток</Label>
              <Input id="maxAttempts" type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="Не задано" className="w-32 h-9 text-sm" />
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={loading} className="rounded-lg min-w-[120px]">
            {loading ? "Создание…" : "Создать вопрос"}
          </Button>
          <Link href={trackId ? `/main/${trackId}` : "/main"}>
            <Button type="button" variant="outline" className="rounded-lg">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

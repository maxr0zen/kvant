"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchQuestionById, updateQuestion } from "@/lib/api/questions";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import type { QuestionChoice } from "@/lib/types";

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

export default function EditQuestionPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [choices, setChoices] = useState<QuestionChoice[]>([]);
  const [multiple, setMultiple] = useState(false);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    fetchQuestionById(id).then((question) => {
      if (cancelled || !question) return;
      if (!question.canEdit) {
        router.replace(`/questions/${id}`);
        return;
      }
      setTitle(question.title);
      setPrompt(question.prompt ?? "");
      setChoices(
        (question.choices ?? []).map((c) => ({
          id: c.id,
          text: c.text,
          isCorrect: c.isCorrect ?? false,
        }))
      );
      setMultiple(question.multiple ?? false);
      setVisibleGroupIds(question.visibleGroupIds ?? []);
      setHints((question.hints ?? []).length > 0 ? question.hints! : [""]);
      setAvailableFrom(toDatetimeLocal(question.availableFrom));
      setAvailableUntil(toDatetimeLocal(question.availableUntil));
      setMaxAttempts(question.maxAttempts != null ? String(question.maxAttempts) : "");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, router]);

  function updateChoice(index: number, patch: Partial<QuestionChoice>) {
    setChoices((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !id) return;
    setSaving(true);
    try {
      await updateQuestion(id, {
        title: title.trim(),
        prompt: prompt.trim(),
        choices: choices.map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect ?? false })),
        multiple,
        visibleGroupIds,
        hints: hints.filter((h) => h.trim()).length > 0 ? hints.filter((h) => h.trim()) : [],
        availableFrom: availableFrom.trim() ? datetimeLocalToISOUTC(availableFrom.trim()) : undefined,
        availableUntil: availableUntil.trim() ? datetimeLocalToISOUTC(availableUntil.trim()) : undefined,
        maxAttempts: maxAttempts.trim() ? parseInt(maxAttempts, 10) : undefined,
      });
      toast({ title: "Вопрос сохранён", description: title });
      router.push(`/questions/${id}`);
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
        <h1 className="text-2xl font-semibold tracking-tight">Редактирование вопроса</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Измените поля и нажмите «Сохранить».</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
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
                </div>
              ))}
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
          <Button type="submit" disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
          <Link href={`/questions/${id}`}><Button type="button" variant="outline">Отмена</Button></Link>
        </div>
      </form>
    </div>
  );
}

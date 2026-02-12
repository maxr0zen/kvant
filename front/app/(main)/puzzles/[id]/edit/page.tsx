"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchPuzzleById, updatePuzzle } from "@/lib/api/puzzles";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import type { PuzzleBlock } from "@/lib/types";

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

export default function EditPuzzlePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<PuzzleBlock[]>([]);
  const [solution, setSolution] = useState("");
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    fetchPuzzleById(id).then((puzzle) => {
      if (cancelled || !puzzle) return;
      if (!puzzle.canEdit) {
        router.replace(`/puzzles/${id}`);
        return;
      }
      setTitle(puzzle.title);
      setDescription(puzzle.description ?? "");
      setBlocks(puzzle.blocks ?? []);
      setSolution(puzzle.solution ?? "");
      setVisibleGroupIds(puzzle.visibleGroupIds ?? []);
      setHints((puzzle.hints ?? []).length > 0 ? puzzle.hints! : [""]);
      setAvailableFrom(toDatetimeLocal(puzzle.availableFrom));
      setAvailableUntil(toDatetimeLocal(puzzle.availableUntil));
      setMaxAttempts(puzzle.maxAttempts != null ? String(puzzle.maxAttempts) : "");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !id) return;
    setSaving(true);
    try {
      await updatePuzzle(id, {
        title: title.trim(),
        description: description.trim(),
        blocks,
        solution,
        visibleGroupIds,
        hints: hints.filter((h) => h.trim()).length > 0 ? hints.filter((h) => h.trim()) : [],
        availableFrom: availableFrom.trim() ? datetimeLocalToISOUTC(availableFrom.trim()) : undefined,
        availableUntil: availableUntil.trim() ? datetimeLocalToISOUTC(availableUntil.trim()) : undefined,
        maxAttempts: maxAttempts.trim() ? parseInt(maxAttempts, 10) : undefined,
      });
      toast({ title: "Puzzle сохранён", description: title });
      router.push(`/puzzles/${id}`);
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
        <h1 className="text-2xl font-semibold tracking-tight">Редактирование puzzle</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Измените поля и нажмите «Сохранить».</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Основное</CardTitle>
            <CardDescription className="text-sm">Название, описание, блоки кода</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-1">
              <Label htmlFor="title">Название</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" required className="h-9" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Описание</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание" rows={2} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Блоки кода</Label>
              <p className="text-xs text-muted-foreground">Порядок и содержимое блоков (order — порядковый номер)</p>
              {blocks.map((b, i) => (
                <div key={b.id} className="rounded border p-3 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <Input placeholder="id" value={b.id} onChange={(e) => setBlocks((prev) => prev.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)))} className="w-24 h-8 text-sm" />
                    <Input placeholder="order" value={b.order} onChange={(e) => setBlocks((prev) => prev.map((x, j) => (j === i ? { ...x, order: e.target.value } : x)))} className="w-16 h-8 text-sm" />
                  </div>
                  <Textarea value={b.code} onChange={(e) => setBlocks((prev) => prev.map((x, j) => (j === i ? { ...x, code: e.target.value } : x)))} rows={3} className="font-mono text-sm" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Область видимости</Label>
              <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="solution">Эталонное решение (опционально)</Label>
              <Textarea id="solution" value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="Код правильного решения" rows={4} className="font-mono text-sm" />
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
          <Link href={`/puzzles/${id}`}><Button type="button" variant="outline">Отмена</Button></Link>
        </div>
      </form>
    </div>
  );
}

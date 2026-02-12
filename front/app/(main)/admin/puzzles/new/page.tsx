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
import { createPuzzle } from "@/lib/api/puzzles";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import type { PuzzleBlock } from "@/lib/types";
import { Plus, Trash2, Settings2, ArrowLeft, Puzzle } from "lucide-react";

const defaultBlock: PuzzleBlock = {
  id: "b1",
  code: 'print("Hello, World!")',
  order: "1",
  indent: "",
};

/** Делит код по строкам на N блоков (примерно поровну). Сохраняет отступ первой строки каждого блока в indent. */
function splitCodeIntoBlocks(code: string, blockCount: number): PuzzleBlock[] {
  const lines = code.split("\n");
  if (lines.length === 0 || blockCount < 1) {
    return [{ ...defaultBlock, id: "b1", order: "1", code: code || "", indent: "" }];
  }
  if (blockCount === 1) {
    const firstLine = lines[0] ?? "";
    const indent = firstLine.match(/^\s*/)?.[0] ?? "";
    return [{ ...defaultBlock, id: "b1", order: "1", code: code.trimEnd(), indent }];
  }
  const blocks: PuzzleBlock[] = [];
  const chunkSize = Math.ceil(lines.length / blockCount);
  for (let i = 0; i < blockCount; i++) {
    const start = i * chunkSize;
    const end = i === blockCount - 1 ? lines.length : (i + 1) * chunkSize;
    const chunkLines = lines.slice(start, end);
    const blockCode = chunkLines.join("\n").trimEnd();
    const firstLine = chunkLines[0] ?? "";
    const indent = firstLine.match(/^\s*/)?.[0] ?? "";
    blocks.push({
      id: "b" + (i + 1),
      code: blockCode,
      order: String(i + 1),
      indent,
    });
  }
  return blocks;
}

const MIN_BLOCKS = 2;

export default function NewPuzzlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trackId = searchParams.get("trackId");
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("python");
  const [sourceCode, setSourceCode] = useState('');
  const [blockCount, setBlockCount] = useState(3);

  // Максимум блоков = число строк в коде (не больше строк, не меньше MIN_BLOCKS)
  const lineCount = sourceCode.trim() ? sourceCode.trim().split("\n").length : 0;
  const effectiveMaxBlocks = lineCount > 0 ? Math.max(MIN_BLOCKS, lineCount) : MIN_BLOCKS;
  const clampedBlockCount = Math.min(effectiveMaxBlocks, Math.max(MIN_BLOCKS, blockCount));
  const [blocks, setBlocks] = useState<PuzzleBlock[]>([
    { ...defaultBlock, id: "b1", order: "1" },
  ]);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [tempMode, setTempMode] = useState<"none" | "until_date" | "duration">("none");
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [maxAttempts, setMaxAttempts] = useState("");
  const [loading, setLoading] = useState(false);

  function addBlock() {
    const newId = "b" + Date.now();
    const newOrder = String(blocks.length + 1);
    setBlocks((prev) => [
      ...prev,
      { ...defaultBlock, id: newId, order: newOrder },
    ]);
  }

  function updateBlock(id: string, patch: Partial<PuzzleBlock>) {
    setBlocks((prev) => {
      const next = prev.map((block) => (block.id === id ? { ...block, ...patch } : block));
      const updated = next.find((b) => b.id === id);
      const isEmpty = updated && (updated.code.trim() === "" && (updated.indent ?? "").trim() === "");
      if (isEmpty && next.length > 1) {
        return next
          .filter((b) => b.id !== id)
          .map((b, idx) => ({ ...b, order: String(idx + 1) }));
      }
      return next;
    });
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
  }

  function moveBlock(id: string, direction: "up" | "down") {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === id);
      if (index === -1) return prev;

      const newBlocks = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex >= 0 && targetIndex < prev.length) {
        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
        return newBlocks.map((block, idx) => ({
          ...block,
          order: String(idx + 1),
        }));
      }
      return prev;
    });
  }

  function applySplit() {
    const n = Math.min(effectiveMaxBlocks, Math.max(MIN_BLOCKS, clampedBlockCount));
    const code = sourceCode.trimEnd();
    if (!code) {
      toast({ title: "Введите код", description: "Напишите код решения для разбиения на блоки", variant: "destructive" });
      return;
    }
    const proposed = splitCodeIntoBlocks(code, n);
    const nonEmpty = proposed
      .filter((b) => b.code.trim() !== "" || (b.indent ?? "").trim() !== "")
      .map((b, i) => ({
        ...b,
        id: "b" + Date.now() + "_" + i,
        order: String(i + 1),
      }));
    setBlocks(nonEmpty.length > 0 ? nonEmpty : [proposed[0] ? { ...proposed[0], id: "b" + Date.now(), order: "1" } : { ...defaultBlock, id: "b" + Date.now(), order: "1" }]);
    setBlockCount(Math.max(MIN_BLOCKS, nonEmpty.length));
    toast({ title: "Разбиение применено", description: `Код разбит на ${n} блоков` });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Ошибка", description: "Введите название puzzle", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const nonEmptyBlocks = blocks.filter((b) => b.code.trim() !== "" || (b.indent ?? "").trim() !== "");
      const sortedBlocks = [...nonEmptyBlocks].sort((a, b) => Number(a.order) - Number(b.order));
      const solutionFromBlocks = sortedBlocks.map((b) => (b.indent || "") + b.code).join("\n");
      const puzzle = await createPuzzle({
        title: title.trim(),
        description: description.trim(),
        language,
        blocks: sortedBlocks.map((b, i) => ({ ...b, order: String(i + 1) })),
        solution: solutionFromBlocks,
        trackId: trackId ?? undefined,
        visibleGroupIds: visibleGroupIds.length > 0 ? visibleGroupIds : undefined,
        hints: hints.filter((h) => h.trim()).length > 0 ? hints.filter((h) => h.trim()) : undefined,
        availableFrom: tempMode === "duration" ? new Date().toISOString() : (availableFrom.trim() ? datetimeLocalToISOUTC(availableFrom.trim()) : undefined),
        availableUntil: tempMode === "duration"
          ? new Date(Date.now() + (parseInt(durationHours, 10) || 0) * 3600000 + (parseInt(durationMinutes, 10) || 0) * 60000).toISOString()
          : (availableUntil.trim() ? datetimeLocalToISOUTC(availableUntil.trim()) : undefined),
        maxAttempts: maxAttempts.trim() ? parseInt(maxAttempts, 10) : undefined,
      });
      toast({ title: "Puzzle создан", description: puzzle.title });
      if (trackId) {
        router.push(
          `/main/${trackId}?added=puzzle&id=${encodeURIComponent(puzzle.id)}&title=${encodeURIComponent(puzzle.title)}&type=puzzle`
        );
      } else {
        router.push(`/puzzles/${puzzle.id}`);
      }
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось создать puzzle",
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
              <Puzzle className="h-6 w-6 text-primary shrink-0" />
              Создание Puzzle
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {trackId ? "Puzzle будет добавлен в трек после сохранения." : "Задание на сборку кода из блоков в правильном порядке."}
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
                <CardDescription className="text-sm">Название, описание, язык</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-2 rounded-lg">
                    <Settings2 className="h-4 w-4" />
                    Дополнительное
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
                  <DialogHeader>
                    <DialogTitle>Дополнительное</DialogTitle>
                    <CardDescription className="text-sm">
                      Группы, подсказки, сроки, ограничение попыток
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
                      <Input id="maxAttempts" type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="Не задано — неограниченно" className="max-w-[140px] h-9 text-sm rounded-lg" />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid gap-3 sm:grid-cols-[1fr,1fr,auto]">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">Название</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Hello World из блоков"
                  required
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language" className="text-sm font-medium">Язык</Label>
                <Input
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="python"
                  className="h-9 rounded-lg"
                />
              </div>
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
            <CardTitle className="text-lg">Код и разбиение на блоки</CardTitle>
            <CardDescription className="text-sm">
              Введите полный код решения. Укажите количество блоков и нажмите «Разбить» — блоки появятся ниже. Их можно править вручную.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Исходный код</Label>
              <div className="min-h-[180px] rounded-lg border border-border/80 overflow-hidden bg-muted/20">
                <CodeEditor
                  value={sourceCode}
                  onChange={setSourceCode}
                  placeholder="Вставьте или напишите полный код решения..."
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="blockCount" className="text-sm whitespace-nowrap">Количество блоков:</Label>
                <Input
                  id="blockCount"
                  type="number"
                  min={MIN_BLOCKS}
                  max={effectiveMaxBlocks}
                  value={clampedBlockCount}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) setBlockCount(Math.min(effectiveMaxBlocks, Math.max(MIN_BLOCKS, v)));
                  }}
                  className="w-16 h-9 text-sm"
                />
                <span className="text-xs text-muted-foreground">
                  от {MIN_BLOCKS} до {effectiveMaxBlocks}
                  {lineCount > 0 ? ` (строк в коде: ${lineCount})` : " — введите код, макс. будет по числу строк"}
                </span>
              </div>
              <Button type="button" onClick={applySplit} variant="default" size="sm" className="rounded-lg">
                Разбить на блоки
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/80">
          <CardHeader>
            <CardTitle className="text-lg">Блоки кода</CardTitle>
            <CardDescription className="text-sm">
              Перетащите блоки в правильном порядке. Количество блоков задаётся выше; можно разбить код кнопкой «Разбить на блоки» или править вручную.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {blocks.map((block, index) => (
              <div
                key={block.id}
                className="rounded-xl border border-border/80 bg-muted/20 p-4 transition-all hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Блок {index + 1}</span>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => moveBlock(block.id, "up")}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => moveBlock(block.id, "down")}
                      disabled={index === blocks.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeBlock(block.id)}
                      disabled={blocks.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="relative w-full">
                  <pre className="text-sm font-mono overflow-x-auto w-full h-full mb-2 rounded bg-background/50 border border-border/50">
                    <code className="block p-3 min-h-[80px]">
                      <Textarea
                        value={block.indent + block.code}
                        onChange={(e) => {
                          const v = e.target.value;
                          const lines = v.split("\n");
                          const first = lines[0] ?? "";
                          const indentMatch = first.match(/^(\s*)/);
                          const indent = indentMatch ? indentMatch[1] : "";
                          const codeFirst = first.slice(indent.length);
                          const code = lines.length <= 1 ? codeFirst : [codeFirst, ...lines.slice(1)].join("\n");
                          updateBlock(block.id, { indent, code });
                        }}
                        placeholder="Фрагмент кода..."
                        rows={4}
                        className="min-h-[80px] w-full resize-y bg-transparent border-0 p-0 text-sm font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </code>
                  </pre>
                </div>
              </div>
            ))}
            {blocks.length === 0 && (
              <div className="py-10 text-muted-foreground rounded-xl border border-dashed border-border/80 bg-muted/20">
                <p className="text-sm">Разбейте код выше или добавьте блок вручную</p>
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addBlock} className="rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              Добавить блок
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={loading} className="rounded-lg min-w-[160px]">
            {loading ? "Создание…" : "Создать puzzle"}
          </Button>
          <Link href="/main">
            <Button type="button" variant="outline" className="rounded-lg">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

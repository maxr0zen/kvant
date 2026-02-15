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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CodeEditor } from "@/components/editor/code-editor";
import { createPuzzle } from "@/lib/api/puzzles";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import { PageHeader } from "@/components/ui/page-header";
import type { PuzzleBlock } from "@/lib/types";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";

const defaultBlock: PuzzleBlock = {
  id: "b1",
  code: 'print("Hello, World!")',
  order: "1",
  indent: "",
};

/** Делит код по строкам на N блоков (примерно поровну). Сохраняет отступ первой строки в indent, остальные строки — с сохранением табуляции и пробелов. */
function splitCodeIntoBlocks(code: string, blockCount: number): PuzzleBlock[] {
  const lines = code.split("\n");
  if (lines.length === 0 || blockCount < 1) {
    return [{ ...defaultBlock, id: "b1", order: "1", code: code || "", indent: "" }];
  }
  if (blockCount === 1) {
    const firstLine = lines[0] ?? "";
    const indent = firstLine.match(/^\s*/)?.[0] ?? "";
    const firstCode = firstLine.slice(indent.length);
    const blockCode = lines.length <= 1 ? firstCode : [firstCode, ...lines.slice(1)].join("\n").trimEnd();
    return [{ ...defaultBlock, id: "b1", order: "1", code: blockCode, indent }];
  }
  const blocks: PuzzleBlock[] = [];
  const chunkSize = Math.ceil(lines.length / blockCount);
  for (let i = 0; i < blockCount; i++) {
    const start = i * chunkSize;
    const end = i === blockCount - 1 ? lines.length : (i + 1) * chunkSize;
    const chunkLines = lines.slice(start, end);
    const firstLine = chunkLines[0] ?? "";
    const indent = firstLine.match(/^\s*/)?.[0] ?? "";
    const firstCode = firstLine.slice(indent.length);
    const blockCode = chunkLines.length <= 1 ? firstCode : [firstCode, ...chunkLines.slice(1)].join("\n").trimEnd();
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
  const [blockMode, setBlockMode] = useState<"manual" | "split">("split");

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

  const breadcrumbs = trackId
    ? [{ label: "Треки", href: "/main" }, { label: "Трек", href: `/main/${trackId}` }, { label: "Новый puzzle" }]
    : [{ label: "Треки", href: "/main" }, { label: "Новый puzzle" }];

  return (
    <div className="space-y-6 w-full max-w-3xl">
      <PageHeader
        title="Создание Puzzle"
        description={trackId ? "Puzzle будет добавлен в трек после сохранения." : "Задание на сборку кода из блоков в правильном порядке."}
        breadcrumbs={breadcrumbs}
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Основное</CardTitle>
                <CardDescription className="text-sm">Название, описание, язык. Дополнительные настройки — в кнопке справа.</CardDescription>
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
                      <Input id="maxAttempts" type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="Без ограничения" className="max-w-[140px] h-9" />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <Label className="text-sm font-medium">Язык</Label>
                <LanguageSelector value={language} onChange={setLanguage} className="h-9 rounded-lg" />
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Блоки кода</CardTitle>
                <CardDescription className="text-sm">
                  Создайте блоки вручную или введите код и разбейте его на части. Табуляция и отступы сохраняются.
                </CardDescription>
              </div>
              <div className="flex rounded-lg border border-border/80 p-0.5 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setBlockMode("manual")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${blockMode === "manual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Вручную
                </button>
                <button
                  type="button"
                  onClick={() => setBlockMode("split")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${blockMode === "split" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Разделить код
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {blockMode === "split" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Исходный код</Label>
                  <div className="min-h-[180px] rounded-lg border border-border/80 overflow-hidden bg-muted/20">
                    <CodeEditor
                      value={sourceCode}
                      onChange={setSourceCode}
                      language={language}
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
              </>
            )}

            <div className={blockMode === "split" ? "border-t pt-4 space-y-4" : "space-y-4"}>
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
                <p className="text-sm">
                  {blockMode === "split" ? "Разбейте код выше или добавьте блок вручную" : "Добавьте блок кнопкой ниже"}
                </p>
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={addBlock} className="rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              Добавить блок
            </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="min-w-[160px]">
            {loading ? "Создание..." : "Создать puzzle"}
          </Button>
          <Link href={trackId ? `/main/${trackId}` : "/main"}>
            <Button type="button" variant="outline">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

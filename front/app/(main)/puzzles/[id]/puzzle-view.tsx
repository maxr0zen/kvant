"use client";

import { useState, useEffect } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import type { Puzzle, PuzzleBlock, PuzzleCheckResult } from "@/lib/types";
import { checkPuzzleSolution } from "@/lib/api/puzzles";
import { GripVertical, Play, RotateCcw } from "lucide-react";
import { isAttemptLimitExceeded, recordFailedAttempt, getRemainingAttempts, getCooldownMinutesRemaining } from "@/lib/utils/attempt-limiter";
import { HintsBlock } from "@/components/hints-block";
import { AvailabilityNotice } from "@/components/availability-notice";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { CodeHighlight } from "@/components/code-highlight";

interface PuzzleViewProps {
  puzzle: Puzzle;
}

export function PuzzleView({ puzzle }: PuzzleViewProps) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<PuzzleBlock[]>([]);
  const [result, setResult] = useState<PuzzleCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<PuzzleBlock | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  // Инициализируем и перемешиваем блоки только на клиенте
  useEffect(() => {
    setMounted(true);
    setBlocks([...puzzle.blocks].sort(() => Math.random() - 0.5));
  }, [puzzle.blocks]);

  function moveBlock(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, movedBlock);
    setBlocks(newBlocks);
    setResult(null); // Сбрасываем результат при изменении
  }

  function removeBlock(index: number) {
    const newBlocks = blocks.filter((_, i) => i !== index);
    setBlocks(newBlocks);
    setResult(null);
  }

  function insertBlock(block: PuzzleBlock, index: number) {
    const newBlocks = [...blocks];
    newBlocks.splice(index, 0, block);
    setBlocks(newBlocks);
    setResult(null);
  }

  function shuffleBlocks() {
    setBlocks([...blocks].sort(() => Math.random() - 0.5));
    setResult(null);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    setDraggedBlock(blocks[index]);
    // Ensure the drag has transferable data for cross-browser support
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch (err) {
      // ignore; some environments may restrict setData
    }
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveBlock(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  async function handleCheck() {
    setLoading(true);
    try {
      if (isAttemptLimitExceeded(puzzle.id)) {
        const minutesLeft = getCooldownMinutesRemaining(puzzle.id);
        toast({
          title: "Лимит попыток исчерпан",
          description: `Вы превысили лимит неверных ответов. Попробуйте через ${minutesLeft} минут.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const res = await checkPuzzleSolution(puzzle.id, blocks);
      setResult(res);
      if (res.passed) {
        router.refresh();
      } else {
        recordFailedAttempt(puzzle.id);
        const remaining = getRemainingAttempts(puzzle.id);
        if (remaining === 0) {
          toast({
            title: "Лимит попыток исчерпан",
            description: "Вы превысили лимит неверных ответов. Попробуйте через час.",
            variant: "destructive",
          });
        } else if (remaining <= 1) {
          toast({
            title: "Внимание",
            description: `У вас осталось ${remaining} попытка. Будьте осторожнее!`,
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      toast({ title: "Ошибка проверки", description: String(err) });
    } finally {
      setLoading(false);
    }
  }

  // Собираем код для предпросмотра
  const assembledCode = blocks.map(block => block.indent + block.code).join("\n");

  // Показываем загрузку пока компонент не смонтирован на клиенте
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">{puzzle.title}</h1>
            <p className="text-muted-foreground mt-2">{puzzle.description}</p>
          </div>
          <AvailabilityCountdown availableUntil={puzzle.availableUntil} className="shrink-0" />
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Загрузка...</div>
        </div>
      </div>
    );
  }

  const maxAttempts = puzzle.maxAttempts ?? null;
  const attemptsUsed = puzzle.attemptsUsed ?? 0;
  const attemptsExhausted = maxAttempts != null && attemptsUsed >= maxAttempts;

  return (
    <div className="space-y-6">
      <AvailabilityNotice availableFrom={puzzle.availableFrom} availableUntil={puzzle.availableUntil} />
      {maxAttempts != null && (
        <p className="text-sm text-muted-foreground">
          {attemptsExhausted ? "Попытки исчерпаны." : `Попыток осталось: ${maxAttempts - attemptsUsed} из ${maxAttempts}`}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{puzzle.title}</h1>
          <p className="text-muted-foreground mt-2">{puzzle.description}</p>
        </div>
        <AvailabilityCountdown availableUntil={puzzle.availableUntil} className="shrink-0" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Блоки кода</CardTitle>
              <CardDescription>
                Перетащите блоки в правильном порядке
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {blocks.map((block, index) => (
                <div
                  key={block.id}
                  className={`
                    rounded-lg bg-muted p-4 transition-all cursor-move
                    ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                    ${dragOverIndex === index ? 'ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-100 dark:bg-blue-900' : ''}
                    ${result && !result.passed ? 'border-4 border-red-400' : ''}
                    ${result && result.passed ? 'border-4 border-green-400' : ''}
                    hover:shadow-md
                  `}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Код с drag & drop и адаптивной подсветкой */}
                  <div className="relative w-full h-full">
                    <pre
                      className="text-sm font-mono overflow-x-auto select-none w-full h-full whitespace-pre"
                    >
                      <code>{block.indent}{block.code}</code>
                    </pre>
                  </div>
                </div>
              ))}
              
              {blocks.length === 0 && (
                <div className="py-8 text-muted-foreground">
                  <p>Перетащите блоки кода сюда</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleCheck}
              disabled={loading || blocks.length === 0 || attemptsExhausted}
              className="flex items-center gap-2"
              size="lg"
            >
              <Play className="h-4 w-4" />
              {loading ? "Проверка..." : "Проверить решение"}
            </Button>
            <Button
              variant="outline"
              onClick={shuffleBlocks}
              className="flex items-center gap-2"
              size="lg"
            >
              <RotateCcw className="h-4 w-4" />
              Перемешать
            </Button>
            {puzzle.trackId && (
              <Link href={`/main/${puzzle.trackId}`}>
                <Button variant="outline" size="lg">К треку</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <HintsBlock hints={puzzle.hints ?? []} />
          <Card>
            <CardHeader>
              <CardTitle>Предпросмотр кода</CardTitle>
              <CardDescription>
                Как будет выглядеть собранный код
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <CodeHighlight
                code={assembledCode || "# Перетащите блоки кода слева"}
                language={puzzle.language ?? "python"}
                className="min-h-[100px] rounded-b-lg"
              />
            </CardContent>
          </Card>

          {/* Result UI intentionally hidden for puzzles; per-block highlighting remains */}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, GripVertical, Play, RotateCcw, Shapes, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import type { AchievementUnlocked, Puzzle, PuzzleBlock, PuzzleCheckResult } from "@/lib/types";
import { checkPuzzleSolution } from "@/lib/api/puzzles";
import {
  getCooldownMinutesRemaining,
  getRemainingAttempts,
  isAttemptLimitExceeded,
  recordFailedAttempt,
} from "@/lib/utils/attempt-limiter";
import { HintsBlock } from "@/components/hints-block";
import { AvailabilityNotice } from "@/components/availability-notice";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { CodeHighlight } from "@/components/code-highlight";
import { AchievementFullscreenCelebration } from "@/components/achievement-fullscreen-celebration";
import { cn } from "@/components/lib/utils";

interface PuzzleViewProps {
  puzzle: Puzzle;
}

function shuffleBlocks(blocks: PuzzleBlock[]) {
  return [...blocks].sort(() => Math.random() - 0.5);
}

export function PuzzleView({ puzzle }: PuzzleViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const shownAchievementIds = useRef<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [blocks, setBlocks] = useState<PuzzleBlock[]>([]);
  const [result, setResult] = useState<PuzzleCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<AchievementUnlocked[]>([]);

  useEffect(() => {
    setMounted(true);
    setBlocks(shuffleBlocks(puzzle.blocks));
    setResult(null);
  }, [puzzle.blocks, puzzle.id]);

  const maxAttempts = puzzle.maxAttempts ?? null;
  const attemptsUsed = puzzle.attemptsUsed ?? 0;
  const attemptsLeft = maxAttempts != null ? Math.max(maxAttempts - attemptsUsed, 0) : null;
  const attemptsExhausted = maxAttempts != null && attemptsLeft === 0;

  const assembledCode = useMemo(
    () => blocks.map((block) => `${block.indent}${block.code}`).join("\n"),
    [blocks]
  );

  function showUnlocked(items: AchievementUnlocked[] | undefined) {
    if (!items?.length) return;
    const fresh = items.filter((item) => item.id && !shownAchievementIds.current.has(item.id));
    if (!fresh.length) return;
    for (const item of fresh) shownAchievementIds.current.add(item.id);
    setUnlockedAchievements(fresh);
  }

  function moveBlock(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const next = [...blocks];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setBlocks(next);
    setResult(null);
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDrop(dropIndex: number) {
    if (draggedIndex != null && draggedIndex !== dropIndex) {
      moveBlock(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  async function handleCheck() {
    if (isAttemptLimitExceeded(puzzle.id)) {
      const minutesLeft = getCooldownMinutesRemaining(puzzle.id);
      toast({
        title: "Лимит попыток исчерпан",
        description: `Попробуйте снова через ${minutesLeft} мин.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await checkPuzzleSolution(puzzle.id, blocks);
      setResult(response);

      if (response.passed) {
        showUnlocked(response.unlockedAchievements);
        toast({ title: "Решение принято", description: response.message });
        router.refresh();
      } else {
        recordFailedAttempt(puzzle.id);
        const remaining = getRemainingAttempts(puzzle.id);
        toast({
          title: remaining === 0 ? "Попытки закончились" : "Порядок пока неверный",
          description:
            remaining === 0
              ? "Следующая попытка будет доступна после cooldown."
              : `Осталось попыток до cooldown: ${remaining}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Не удалось проверить решение",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Готовим puzzle workspace...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AvailabilityNotice availableFrom={puzzle.availableFrom} availableUntil={puzzle.availableUntil} />

      <section className="hero-surface rounded-[2rem] border border-border/60 px-6 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr,0.65fr] lg:items-end">
          <div className="space-y-4">
            <div className="kavnt-badge w-fit">Logic puzzle</div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">{puzzle.title}</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{puzzle.description}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Блоков</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{blocks.length}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Дедлайн</p>
              <div className="mt-3">
                <AvailabilityCountdown availableUntil={puzzle.availableUntil} />
              </div>
            </div>
            {maxAttempts != null ? (
              <div className="rounded-3xl border border-border/70 bg-card/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Попытки</p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-foreground">
                  {attemptsExhausted ? "Лимит исчерпан" : `Осталось ${attemptsLeft} из ${maxAttempts}`}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Соберите порядок блоков</CardTitle>
            <CardDescription>
              Перетаскивайте карточки, пока логика решения не станет цельной и читаемой.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {blocks.map((block, index) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverIndex(index);
                }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(index);
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className={cn(
                  "rounded-2xl border p-4 transition",
                  draggedIndex === index && "scale-[0.99] opacity-60",
                  dragOverIndex === index
                    ? "border-primary/40 bg-primary/5 shadow-[0_14px_32px_rgba(39,110,241,0.12)]"
                    : "border-border/70 bg-muted/15 hover:border-primary/20 hover:bg-background"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border border-border/60 bg-background text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-6 text-foreground">
                    <code>{`${block.indent}${block.code}`}</code>
                  </pre>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-3 pt-3">
              <Button onClick={() => void handleCheck()} disabled={loading || blocks.length === 0 || attemptsExhausted} className="gap-2">
                <Play className="h-4 w-4" />
                {loading ? "Проверяю..." : "Проверить решение"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBlocks(shuffleBlocks(blocks));
                  setResult(null);
                }}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Перемешать
              </Button>
              {puzzle.trackId ? (
                <Link href={`/main/${puzzle.trackId}`}>
                  <Button variant="outline">К треку</Button>
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Предпросмотр</CardTitle>
              <CardDescription>Так будет выглядеть собранный код в текущем порядке.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <CodeHighlight
                code={assembledCode || "# Перетащите блоки в нужном порядке"}
                language={puzzle.language ?? "python"}
                className="min-h-[160px] rounded-b-[1.5rem]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Статус</CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-sm leading-6",
                    result.passed
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
                      : "border-rose-500/20 bg-rose-500/10 text-rose-800"
                  )}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {result.passed ? <CheckCircle2 className="h-4 w-4" /> : <Shapes className="h-4 w-4" />}
                    {result.passed ? "Порядок верный" : "Нужно перестроить блоки"}
                  </div>
                  <p className="mt-3">{result.message}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-muted/15 px-4 py-4 text-sm text-muted-foreground">
                  Когда проверите puzzle, итог и обратная связь появятся здесь.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Подход</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                Сначала найдите опорный блок, с которого естественно начинается алгоритм.
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                Проверьте, чтобы вложенность и отступы поддерживали логику, а не ломали ее.
              </div>
            </CardContent>
          </Card>

          <HintsBlock hints={puzzle.hints ?? []} />
        </div>
      </div>

      <AchievementFullscreenCelebration items={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
    </div>
  );
}

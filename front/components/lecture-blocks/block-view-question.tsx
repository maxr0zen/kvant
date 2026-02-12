"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import type { LectureBlock } from "@/lib/types";
import { checkLectureBlockAnswer } from "@/lib/api/lectures";
import { Lightbulb } from "lucide-react";

const ORDER_STORAGE_KEY = (lid: string, bid: string) => `lecture_q_order_${lid}_${bid}`;

function getStoredOrder(lectureId: string, blockId: string): { id: string; text: string }[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ORDER_STORAGE_KEY(lectureId, blockId));
    if (!raw) return null;
    return JSON.parse(raw) as { id: string; text: string }[];
  } catch {
    return null;
  }
}

function saveOrder(lectureId: string, blockId: string, order: { id: string; text: string }[]) {
  try {
    sessionStorage.setItem(ORDER_STORAGE_KEY(lectureId, blockId), JSON.stringify(order));
  } catch {
    // ignore
  }
}

interface BlockViewQuestionProps {
  block: Extract<LectureBlock, { type: "question" }>;
  lectureId: string;
  wasEverCorrect?: boolean;
  correctIds?: string[] | null;
  onCorrectAnswer?: () => void;
}

export function BlockViewQuestion({ block, lectureId, wasEverCorrect = false, correctIds = null, onCorrectAnswer }: BlockViewQuestionProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; message: string } | null>(null);

  const [orderedChoices, setOrderedChoices] = useState<{ id: string; text: string }[]>(() =>
    (block.choices || []).map((c) => ({ id: c.id, text: c.text }))
  );
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const hints = block.hints?.filter((h) => h?.trim()) ?? [];

  useEffect(() => {
    const choices = block.choices || [];
    const stored = getStoredOrder(lectureId, block.id!);
    if (stored && stored.length === choices.length && choices.every((c) => stored.some((s) => s.id === c.id))) {
      setOrderedChoices(stored);
      return;
    }
    const arr = [...choices];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const order = arr.map((c) => ({ id: c.id, text: c.text }));
    saveOrder(lectureId, block.id!, order);
    setOrderedChoices(order);
  }, [lectureId, block.id, block.choices]);

  function toggleChoice(id: string) {
    if (block.multiple) {
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else {
      setSelected([id]);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await checkLectureBlockAnswer(lectureId, block.id, selected);
      setResult(res);
      if (res.passed) {
        toast({ title: "Правильно!", description: res.message });
        onCorrectAnswer?.();
        router.refresh();
      }
    } catch (err) {
      toast({ title: "Ошибка", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const allowSubmit = selected.length > 0;

  const showCorrectHighlight = wasEverCorrect || result?.passed;
  const effectiveCorrectIds = correctIds ?? (result?.passed ? selected : null);

  return (
    <div>
      <Card className={`rounded-xl border-2 shadow-sm transition-colors ${
        showCorrectHighlight ? "border-green-500/50 bg-green-500/10" : "border-primary/30 bg-primary/5"
      }`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{block.title}</CardTitle>
          {block.prompt?.trim() && (
            <CardDescription>{block.prompt}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Выберите {block.multiple ? "один или несколько" : "один"} вариантов:
          </p>
          <div className="space-y-2">
            {orderedChoices.map((c) => {
              const isCorrect = showCorrectHighlight && effectiveCorrectIds?.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`rounded-lg p-3 transition-all border cursor-pointer select-none text-sm ${
                    isCorrect
                      ? "bg-green-500/20 border-green-500/50 text-green-800 dark:text-green-200"
                      : selected.includes(c.id)
                        ? "bg-accent text-accent-foreground border-transparent"
                        : "bg-muted/50 hover:bg-muted"
                  }`}
                  onClick={() => toggleChoice(c.id)}
                >
                  {c.text}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={handleSubmit} disabled={!allowSubmit || loading} size="sm">
              {loading ? "Проверка..." : "Проверить"}
            </Button>
            {result && (
              <span className={result.passed ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                {result.message}
              </span>
            )}
          </div>
          {hints.length > 0 && (
            <div className="mt-3 pt-3 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5" /> Подсказки
              </p>
              {hints.slice(0, hintsRevealed).map((h, i) => (
                <p key={i} className="text-sm bg-muted/50 rounded-md px-3 py-2">
                  {h}
                </p>
              ))}
              {hintsRevealed < hints.length && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setHintsRevealed((n) => n + 1)}
                >
                  <Lightbulb className="h-3.5 w-3.5" />
                  {hintsRevealed === 0 ? "Показать подсказку" : `Подсказка ${hintsRevealed + 1}`}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

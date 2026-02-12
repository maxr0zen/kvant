"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import type { Question, QuestionChoice, QuestionCheckResult } from "@/lib/types";
import { checkQuestionAnswer } from "@/lib/api/questions";
import { isAttemptLimitExceeded, recordFailedAttempt, getRemainingAttempts, getCooldownMinutesRemaining } from "@/lib/utils/attempt-limiter";
import { HintsBlock } from "@/components/hints-block";
import { AvailabilityNotice } from "@/components/availability-notice";
import { AvailabilityCountdown } from "@/components/availability-countdown";

interface QuestionViewProps {
  question: Question;
}

export function QuestionView({ question }: QuestionViewProps) {
  const router = useRouter();
  const [shuffled, setShuffled] = useState<QuestionChoice[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuestionCheckResult | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // shuffle choices on mount
    const arr = [...question.choices];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffled(arr);
    setSelected([]);
    setResult(null);
  }, [question.id]);

  function toggleChoice(id: string) {
    if (question.multiple) {
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else {
      setSelected([id]);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      if (isAttemptLimitExceeded(question.id)) {
        const minutesLeft = getCooldownMinutesRemaining(question.id);
        toast({
          title: "Лимит попыток исчерпан",
          description: `Вы превысили лимит неверных ответов. Попробуйте через ${minutesLeft} минут.`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const res = await checkQuestionAnswer(question.id, selected);
      setResult(res);
      if (!res.passed) {
        recordFailedAttempt(question.id);
        const remaining = getRemainingAttempts(question.id);
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
      } else {
        toast({ title: "Решение верное", description: res.message, variant: "default" });
        router.refresh();
      }
    } catch (err) {
      toast({ title: "Ошибка", description: String(err) });
    } finally {
      setLoading(false);
    }
  }

  const maxAttempts = question.maxAttempts ?? null;
  const attemptsUsed = question.attemptsUsed ?? 0;
  const attemptsExhausted = maxAttempts != null && attemptsUsed >= maxAttempts;
  const allowSubmit = selected.length > 0 && !attemptsExhausted;

  return (
    <div className="space-y-6">
      <AvailabilityNotice availableFrom={question.availableFrom} availableUntil={question.availableUntil} />
      {maxAttempts != null && (
        <p className="text-sm text-muted-foreground">
          {attemptsExhausted ? "Попытки исчерпаны." : `Попыток осталось: ${maxAttempts - attemptsUsed} из ${maxAttempts}`}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">{question.title}</h1>
          <p className="text-muted-foreground mt-2">{question.prompt}</p>
        </div>
        <AvailabilityCountdown availableUntil={question.availableUntil} className="shrink-0" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Варианты ответа</CardTitle>
              <CardDescription>Выберите {question.multiple ? "один или несколько" : "один"} вариантов</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {shuffled.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg p-3 transition-all border cursor-pointer select-none ${
                    selected.includes(c.id) ? "bg-accent text-accent-foreground border-transparent" : "bg-muted"
                  }`}
                  onClick={() => toggleChoice(c.id)}
                >
                  <div className="text-sm">{c.text}</div>
                </div>
              ))}

              <div className="flex gap-3 pt-3">
                <Button onClick={handleSubmit} disabled={!allowSubmit || loading} size="lg">
                  {loading ? "Проверка..." : "Проверить"}
                </Button>
                <Button variant="outline" onClick={() => {
                  // reshuffle
                  const arr = [...question.choices];
                  for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                  }
                  setShuffled(arr);
                  setSelected([]);
                  setResult(null);
                }}>
                  Перемешать
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <HintsBlock hints={question.hints ?? []} />
          <Card>
            <CardHeader>
              <CardTitle>Результат</CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className={result.passed ? "text-green-600" : "text-red-600"}>
                  {result.message}
                </div>
              ) : (
                <div className="text-muted-foreground">Выберите варианты и нажмите «Проверить»</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

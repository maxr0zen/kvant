"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleHelp, RotateCcw, Sparkles, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import type { AchievementUnlocked, Question, QuestionChoice, QuestionCheckResult } from "@/lib/types";
import { checkQuestionAnswer } from "@/lib/api/questions";
import {
  getCooldownMinutesRemaining,
  getRemainingAttempts,
  isAttemptLimitExceeded,
  recordFailedAttempt,
} from "@/lib/utils/attempt-limiter";
import { AvailabilityCountdown } from "@/components/availability-countdown";
import { AvailabilityNotice } from "@/components/availability-notice";
import { HintsBlock } from "@/components/hints-block";
import { AchievementUnlockCelebration } from "@/components/achievement-unlock-celebration";
import { cn } from "@/components/lib/utils";

interface QuestionViewProps {
  question: Question;
}

function shuffleChoices(choices: QuestionChoice[]) {
  const next = [...choices];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function QuestionView({ question }: QuestionViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const shownAchievementIds = useRef<Set<string>>(new Set());
  const [choices, setChoices] = useState<QuestionChoice[]>(() => shuffleChoices(question.choices));
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuestionCheckResult | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<AchievementUnlocked[]>([]);

  useEffect(() => {
    setChoices(shuffleChoices(question.choices));
    setSelected([]);
    setResult(null);
  }, [question.id, question.choices]);

  const maxAttempts = question.maxAttempts ?? null;
  const attemptsUsed = question.attemptsUsed ?? 0;
  const attemptsLeft = maxAttempts != null ? Math.max(maxAttempts - attemptsUsed, 0) : null;
  const attemptsExhausted = maxAttempts != null && attemptsLeft === 0;
  const canSubmit = selected.length > 0 && !attemptsExhausted && !loading;

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function showUnlocked(items: AchievementUnlocked[] | undefined) {
    if (!items?.length) return;
    const fresh = items.filter((item) => item.id && !shownAchievementIds.current.has(item.id));
    if (!fresh.length) return;
    for (const item of fresh) shownAchievementIds.current.add(item.id);
    setUnlockedAchievements(fresh);
  }

  function toggleChoice(id: string) {
    if (question.multiple) {
      setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
      return;
    }
    setSelected([id]);
  }

  async function handleSubmit() {
    if (isAttemptLimitExceeded(question.id)) {
      const minutesLeft = getCooldownMinutesRemaining(question.id);
      toast({
        title: "Лимит попыток исчерпан",
        description: `Попробуйте снова через ${minutesLeft} мин.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await checkQuestionAnswer(question.id, selected);
      setResult(response);

      if (response.passed) {
        showUnlocked(response.unlockedAchievements);
        toast({ title: "Ответ верный", description: response.message });
        router.refresh();
      } else {
        recordFailedAttempt(question.id);
        const remaining = getRemainingAttempts(question.id);
        toast({
          title: remaining === 0 ? "Попытки закончились" : "Ответ пока неверный",
          description:
            remaining === 0
              ? "Следующая попытка будет доступна после cooldown."
              : `Осталось попыток до cooldown: ${remaining}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Не удалось проверить ответ",
        description: error instanceof Error ? error.message : "Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function resetQuestion() {
    setChoices(shuffleChoices(question.choices));
    setSelected([]);
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <AvailabilityNotice availableFrom={question.availableFrom} availableUntil={question.availableUntil} />

      <section className="hero-surface rounded-[2rem] border border-border/60 px-6 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr,0.65fr] lg:items-end">
          <div className="space-y-4">
            <div className="kavnt-badge w-fit">{question.multiple ? "Multiple choice" : "Single choice"}</div>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">{question.title}</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{question.prompt}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Формат</p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-foreground">
                {question.multiple ? "Несколько вариантов" : "Один вариант"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Дедлайн</p>
              <div className="mt-3">
                <AvailabilityCountdown availableUntil={question.availableUntil} />
              </div>
            </div>
            {maxAttempts != null ? (
              <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:col-span-2">
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
            <CardTitle>Выберите ответ</CardTitle>
            <CardDescription>
              {question.multiple
                ? "Можно отметить несколько вариантов. Сначала подумайте, затем отправьте ответ на проверку."
                : "Выберите один вариант и отправьте его на проверку."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {choices.map((choice, index) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => toggleChoice(choice.id)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition",
                  selectedSet.has(choice.id)
                    ? "border-primary/40 bg-primary/5 shadow-[0_14px_32px_rgba(39,110,241,0.12)]"
                    : "border-border/70 bg-muted/15 hover:border-primary/20 hover:bg-background"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </div>
                  <div className="pt-1 text-sm leading-6 text-foreground">{choice.text}</div>
                </div>
              </button>
            ))}

            <div className="flex flex-wrap gap-3 pt-3">
              <Button onClick={() => void handleSubmit()} disabled={!canSubmit} className="gap-2">
                <Target className="h-4 w-4" />
                {loading ? "Проверяю..." : "Проверить"}
              </Button>
              <Button variant="outline" onClick={resetQuestion} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Перемешать
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
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
                    {result.passed ? <CheckCircle2 className="h-4 w-4" /> : <CircleHelp className="h-4 w-4" />}
                    {result.passed ? "Верное решение" : "Нужна еще попытка"}
                  </div>
                  <p className="mt-3">{result.message}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/60 bg-muted/15 px-4 py-4 text-sm text-muted-foreground">
                  Выберите вариант и отправьте ответ. Результат проверки появится здесь.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Тактика</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                Сначала определите, какой именно смысл проверяет вопрос, и только потом выбирайте вариант.
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                Если задание допускает несколько ответов, ищите полный набор, а не только первый очевидный пункт.
              </div>
            </CardContent>
          </Card>

          <HintsBlock hints={question.hints ?? []} />
        </div>
      </div>

      <AchievementUnlockCelebration items={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
    </div>
  );
}

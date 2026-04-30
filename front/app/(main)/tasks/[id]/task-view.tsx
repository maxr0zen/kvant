"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/editor/code-editor";
import { TestCasesPanel } from "@/components/testcases/testcases-panel";
import { runPythonInBrowser, normalizeOutput } from "@/lib/runner/browser-python";
import type { AchievementUnlocked, Task } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import type { TestRunResult } from "@/lib/types";
import { submitTask, fetchTaskDraft, saveTaskDraft } from "@/lib/api/tasks";
import { hasApi } from "@/lib/api/client";
import { getStoredToken } from "@/lib/api/auth";
import { isAttemptLimitExceeded, recordFailedAttempt, getRemainingAttempts, getCooldownMinutesRemaining } from "@/lib/utils/attempt-limiter";
import { HintsBlock } from "@/components/hints-block";
import { AvailabilityNotice } from "@/components/availability-notice";
import { AchievementFullscreenCelebration } from "@/components/achievement-fullscreen-celebration";

const DRAFT_SAVE_DELAY_MS = 1500;

export function TaskView({ task }: { task: Task }) {
  const router = useRouter();
  const [code, setCode] = useState(task.starterCode);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!hasApi() || !getStoredToken()) {
      setDraftLoaded(true);
      return;
    }
    let cancelled = false;
    fetchTaskDraft(task.id).then((saved) => {
      if (!cancelled && saved != null) {
        setCode(saved);
      }
      if (!cancelled) setDraftLoaded(true);
    });
    return () => { cancelled = true; };
  }, [task.id]);

  const scheduleSaveDraft = useCallback(() => {
    if (!hasApi() || !getStoredToken()) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      saveTaskDraft(task.id, code);
    }, DRAFT_SAVE_DELAY_MS);
  }, [task.id, code]);

  useEffect(() => {
    if (!draftLoaded) return;
    scheduleSaveDraft();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [draftLoaded, code, scheduleSaveDraft]);

  useEffect(() => {
    const saveOnLeave = () => {
      if (hasApi() && getStoredToken() && draftLoaded && code !== task.starterCode) {
        saveTaskDraft(task.id, code, true);
      }
    };
    const handler = () => {
      saveOnLeave();
    };
    window.addEventListener("beforeunload", handler);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveOnLeave();
    });
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [task.id, task.starterCode, code, draftLoaded]);
  const [runResults, setRunResults] = useState<TestRunResult[] | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<AchievementUnlocked[]>([]);
  const shownAchievementIds = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState<"run" | "submit" | null>(null);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const { toast } = useToast();

  function showUnlocked(items: AchievementUnlocked[] | undefined) {
    if (!items || items.length === 0) return;
    const fresh = items.filter((a) => a.id && !shownAchievementIds.current.has(a.id));
    if (!fresh.length) return;
    for (const a of fresh) shownAchievementIds.current.add(a.id);
    setUnlockedAchievements(fresh);
  }

  async function runTests(
    testCases: { id: string; input: string; expectedOutput: string }[]
  ): Promise<TestRunResult[]> {
    const results: TestRunResult[] = [];
    for (const tc of testCases) {
      const { stdout, error } = await runPythonInBrowser(code, tc.input);
      const actual = normalizeOutput(stdout);
      const expected = normalizeOutput(tc.expectedOutput);
      const passed = !error && actual === expected;
      results.push({
        caseId: tc.id,
        passed,
        actualOutput: stdout || undefined,
        error: error ?? (passed ? undefined : "Неверный ответ"),
      });
    }
    return results;
  }

  async function handleRun() {
    setLoading("run");
    setRunResults(null);
    try {
      setPyodideLoading(true);
      const results = await runTests(
        task.testCases.map((c) => ({
          id: c.id,
          input: c.input,
          expectedOutput: c.expectedOutput,
        }))
      );
      setPyodideLoading(false);
      setRunResults(results);
      const passed = results.every((r) => r.passed);
      toast({
        title: passed ? "Решение верное" : "Решение неверное",
        description: passed ? "Все публичные тесты пройдены." : "Проверьте вывод и исправьте код.",
        variant: passed ? "default" : "destructive",
      });
    } catch (e) {
      setPyodideLoading(false);
      toast({
        title: "Ошибка",
        description:
          e instanceof Error ? e.message : "Не удалось запустить тесты",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  async function handleSubmit() {
    setLoading("submit");
    setRunResults(null);
    const useBackend = hasApi() && typeof window !== "undefined" && getStoredToken();
    try {
      if (isAttemptLimitExceeded(task.id)) {
        const minutesLeft = getCooldownMinutesRemaining(task.id);
        toast({
          title: "Лимит попыток исчерпан",
          description: `Вы превысили лимит неверных ответов. Попробуйте через ${minutesLeft} минут.`,
          variant: "destructive",
        });
        setLoading(null);
        return;
      }

      if (useBackend) {
        const result = await submitTask(task.id, code);
        setRunResults(result.results);
        if (!result.passed) {
          recordFailedAttempt(task.id);
          const remaining = getRemainingAttempts(task.id);
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
          } else {
            toast({
              title: "Решение неверное",
              description: result.message ?? "Часть тестов не пройдена.",
              variant: "destructive",
            });
          }
        } else {
          showUnlocked(result.unlockedAchievements);
          toast({
            title: "Решение верное",
            description: result.message ?? "Все тесты пройдены.",
            variant: "default",
          });
          router.refresh();
        }
      } else {
        setPyodideLoading(true);
        const results = await runTests(
          task.testCases.map((c) => ({
            id: c.id,
            input: c.input,
            expectedOutput: c.expectedOutput,
          }))
        );
        setPyodideLoading(false);
        setRunResults(results);
        const passed = results.every((r) => r.passed);
        if (!passed) {
          recordFailedAttempt(task.id);
          const remaining = getRemainingAttempts(task.id);
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
          } else {
            toast({
              title: "Решение неверное",
              description: "Проверьте вывод и исправьте код.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Решение верное",
            description: "Все тесты пройдены.",
            variant: "default",
          });
          router.refresh();
        }
      }
    } catch (e) {
      setPyodideLoading(false);
      toast({
        title: "Ошибка",
        description:
          e instanceof Error ? e.message : "Не удалось отправить решение",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  const runButtonLabel =
    loading === "run"
      ? pyodideLoading
        ? "Загрузка Pyodide..."
        : "Запуск..."
      : "Запустить тесты";
  const submitButtonLabel =
    loading === "submit"
      ? pyodideLoading
        ? "Загрузка Pyodide..."
        : "Отправка..."
      : "Отправить решение";

  const maxAttempts = task.maxAttempts ?? null;
  const attemptsUsed = task.attemptsUsed ?? 0;
  const attemptsExhausted = maxAttempts != null && attemptsUsed >= maxAttempts;
  const submitDisabled = loading !== null || attemptsExhausted;

  return (
    <div className="space-y-4">
      <AvailabilityNotice availableFrom={task.availableFrom} availableUntil={task.availableUntil} />
      {maxAttempts != null && (
        <p className="text-sm text-muted-foreground">
          {attemptsExhausted
            ? "Попытки исчерпаны для этого задания."
            : `Попыток осталось: ${maxAttempts - attemptsUsed} из ${maxAttempts}`}
        </p>
      )}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-4 min-w-0">
          <CodeEditor value={code} onChange={setCode} language={task.language ?? "python"} />
          <div className="flex flex-wrap gap-2 pt-1 sm:gap-3">
            <Button
              onClick={handleRun}
              disabled={loading !== null}
              variant="outline"
            >
              {runButtonLabel}
            </Button>
            <Button onClick={handleSubmit} disabled={submitDisabled}>
              {submitButtonLabel}
            </Button>
            {task.trackId && (
              <Link href={`/main/${task.trackId}`}>
                <Button variant="ghost">К треку</Button>
              </Link>
            )}
          </div>
        </div>
        <div className="space-y-4 min-w-0 xl:border-l xl:pl-6">
          <TestCasesPanel
            testCases={task.testCases.map((c) => ({
              id: c.id,
              input: c.input,
              expectedOutput: c.expectedOutput,
              isPublic: c.isPublic,
            }))}
            results={runResults}
          />
          <HintsBlock hints={task.hints ?? []} />
        </div>
      </div>
      <AchievementFullscreenCelebration
        items={unlockedAchievements}
        onDone={() => setUnlockedAchievements([])}
      />
    </div>
  );
}

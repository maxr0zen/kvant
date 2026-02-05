"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/editor/code-editor";
import { TestCasesPanel } from "@/components/testcases/testcases-panel";
import { runPythonInBrowser, normalizeOutput } from "@/lib/runner/browser-python";
import type { Task } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import type { TestRunResult } from "@/lib/types";
import { submitTask } from "@/lib/api/tasks";
import { hasApi } from "@/lib/api/client";
import { getStoredToken } from "@/lib/api/auth";
import { isAttemptLimitExceeded, recordFailedAttempt, getRemainingAttempts, getCooldownMinutesRemaining } from "@/lib/utils/attempt-limiter";

export function TaskView({ task }: { task: Task }) {
  const [code, setCode] = useState(task.starterCode);
  const [runResults, setRunResults] = useState<TestRunResult[] | null>(null);
  const [loading, setLoading] = useState<"run" | "submit" | null>(null);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const { toast } = useToast();

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
          toast({
            title: "Решение верное",
            description: result.message ?? "Все тесты пройдены.",
            variant: "default",
          });
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <CodeEditor value={code} onChange={setCode} />
        <div className="flex flex-wrap gap-3 pt-1">
          <Button
            onClick={handleRun}
            disabled={loading !== null}
            variant="outline"
          >
            {runButtonLabel}
          </Button>
          <Button onClick={handleSubmit} disabled={loading !== null}>
            {submitButtonLabel}
          </Button>
          {task.trackId && (
            <Link href={`/tracks/${task.trackId}`}>
              <Button variant="ghost">К треку</Button>
            </Link>
          )}
        </div>
      </div>
      <div className="lg:border-l lg:pl-6">
        <TestCasesPanel
          testCases={task.testCases.map((c) => ({
            id: c.id,
            input: c.input,
            expectedOutput: c.expectedOutput,
            isPublic: c.isPublic,
          }))}
          results={runResults}
        />
      </div>
    </div>
  );
}

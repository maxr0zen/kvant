"use client";

import { cn } from "@/components/lib/utils";
import type { TestRunResult } from "@/lib/types";
import { Check, X } from "lucide-react";

export interface TestCaseDisplay {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
}

interface TestCasesPanelProps {
  testCases: TestCaseDisplay[];
  results?: TestRunResult[] | null;
  className?: string;
}

export function TestCasesPanel({
  testCases,
  results = null,
  className,
}: TestCasesPanelProps) {
  const getResult = (caseId: string) =>
    results?.find((r) => r.caseId === caseId);

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-sm font-semibold">Тесты</h3>
      <ul className="space-y-2">
        {testCases.map((tc) => {
          const result = getResult(tc.id);
          const passed = result?.passed;
          return (
            <li
              key={tc.id}
              className="rounded-lg border bg-card p-3 text-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                {result != null ? (
                  passed ? (
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-destructive shrink-0" />
                  )
                ) : (
                  <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/50" />
                )}
                <span className="font-medium">Тест</span>
              </div>
              <div className="space-y-1.5 text-muted-foreground">
                {tc.input !== undefined && tc.input !== "" && (
                  <p>
                    <span className="text-foreground/80">Ввод:</span>{" "}
                    <code className="rounded bg-muted px-1 font-mono text-xs break-all">
                      {tc.input === "" ? "(пусто)" : tc.input}
                    </code>
                  </p>
                )}
                <div>
                  <span className="text-foreground/80">Ожидаемый вывод:</span>
                  <pre className="mt-0.5 rounded bg-muted px-2 py-1 font-mono text-xs whitespace-pre-wrap break-words text-foreground">
                    {tc.expectedOutput === "" ? "(пустой вывод)" : tc.expectedOutput}
                  </pre>
                </div>
                {result != null && !result.passed && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 space-y-1.5 text-xs">
                    <p className="font-medium text-foreground">Неверный ответ</p>
                    <div>
                      <span className="text-foreground/80">Ожидалось:</span>
                      <pre className="mt-0.5 rounded bg-muted px-2 py-1 font-mono whitespace-pre-wrap break-words text-foreground">
                        {tc.expectedOutput === "" ? "(пустой вывод)" : tc.expectedOutput}
                      </pre>
                    </div>
                    <div>
                      <span className="text-foreground/80">Результат работы программы:</span>
                      <pre className="mt-0.5 rounded bg-muted px-2 py-1 font-mono whitespace-pre-wrap break-words text-foreground">
                        {result.actualOutput === undefined || result.actualOutput === ""
                          ? "(пусто)"
                          : result.actualOutput}
                      </pre>
                    </div>
                    {result.error && result.error !== "Неверный ответ" && (
                      <p className="text-destructive pt-0.5">{result.error}</p>
                    )}
                  </div>
                )}
                {result != null && result.passed && (
                  <p className="text-green-600 dark:text-green-500 text-xs">Вывод совпадает с ожидаемым.</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

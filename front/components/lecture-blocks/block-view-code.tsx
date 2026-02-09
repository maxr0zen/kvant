"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2 } from "lucide-react";
import { runPythonInBrowser } from "@/lib/runner/browser-python";
import type { LectureBlock } from "@/lib/types";

interface BlockViewCodeProps {
  block: Extract<LectureBlock, { type: "code" }>;
}

const hasInput = (code: string) => /input\s*\(/.test(code);

export function BlockViewCode({ block }: BlockViewCodeProps) {
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stdin, setStdin] = useState(block.stdin ?? "");

  async function handleRun() {
    setRunning(true);
    setOutput(null);
    try {
      setLoading(true);
      const result = await runPythonInBrowser(block.code || "", stdin);
      setLoading(false);
      const text = result.error
        ? `Ошибка: ${result.error}`
        : result.stdout || result.stderr || "(пустой вывод)";
      setOutput(text);
    } catch (e) {
      setLoading(false);
      setOutput(
        "Ошибка запуска: " + (e instanceof Error ? e.message : "Неизвестная ошибка")
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
      {block.explanation?.trim() && (
        <div className="p-4 pb-0">
          <p className="text-sm text-muted-foreground">{block.explanation}</p>
        </div>
      )}
      <div className="rounded-b-lg border-t bg-muted/30">
        {hasInput(block.code || "") && (
          <div className="border-b bg-muted/40 px-3 py-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Ввод для input():
            </label>
            <input
              type="text"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Введите данные..."
              className="w-full rounded border bg-background px-2 py-1.5 text-sm font-mono"
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {block.language ?? "Python"}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRun}
            disabled={running}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {loading ? "Загрузка Pyodide..." : running ? "Запуск..." : "Запустить"}
          </Button>
        </div>
        <pre className="p-4 overflow-x-auto text-sm font-mono bg-background">
          <code>{block.code || " "}</code>
        </pre>
        {output !== null && (
          <div className="border-t bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Вывод:
            </p>
            <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-background rounded p-3 border">
              {output}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

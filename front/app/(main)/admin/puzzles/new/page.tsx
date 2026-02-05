"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { CodeEditor } from "@/components/editor/code-editor";
import { createPuzzle } from "@/lib/api/puzzles";
import { useToast } from "@/components/ui/use-toast";
import type { PuzzleBlock } from "@/lib/types";
import { Plus, Trash2, GripVertical } from "lucide-react";

const defaultBlock: PuzzleBlock = {
  id: "b1",
  code: 'print("Hello, World!")',
  order: "1",
  indent: "",
};

export default function NewPuzzlePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("python");
  const [solution, setSolution] = useState("");
  const [blocks, setBlocks] = useState<PuzzleBlock[]>([
    { ...defaultBlock, id: "b1", order: "1" },
  ]);
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
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...patch } : block))
    );
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
        // Меняем местами блоки
        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
        
        // Обновляем порядок
        return newBlocks.map((block, idx) => ({
          ...block,
          order: String(idx + 1),
        }));
      }

      return prev;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Ошибка", description: "Введите название puzzle", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const puzzle = await createPuzzle({
        title: title.trim(),
        description: description.trim(),
        language,
        blocks,
        solution: solution.trim(),
      });
      toast({ title: "Puzzle создан", description: puzzle.title });
      router.push(`/puzzles/${puzzle.id}`);
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Создание Puzzle</h1>
        <p className="text-muted-foreground mt-1">
          Создайте задание на сборку кода из блоков в правильном порядке.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Основное</CardTitle>
            <CardDescription>Название и описание puzzle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Hello World из блоков"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Условие задачи для ученика"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Язык программирования</Label>
              <Input
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="python"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Блоки кода</CardTitle>
            <CardDescription>
              Блоки, которые ученик должен будет расположить в правильном порядке
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {blocks.map((block, index) => (
              <div
                key={block.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Блок {index + 1}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveBlock(block.id, "up")}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveBlock(block.id, "down")}
                      disabled={index === blocks.length - 1}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeBlock(block.id)}
                      disabled={blocks.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Код блока</Label>
                  <div className="min-h-[100px]">
                    <CodeEditor
                      value={block.code}
                      onChange={(code) => updateBlock(block.id, { code })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Отступ (если нужен)</Label>
                  <Input
                    value={block.indent}
                    onChange={(e) => updateBlock(block.id, { indent: e.target.value })}
                    placeholder="Например:    (4 пробела)"
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addBlock}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить блок
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Решение (опционально)</CardTitle>
            <CardDescription>
              Полный правильный код для дополнительной проверки
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CodeEditor
              value={solution}
              onChange={setSolution}
              placeholder="Введите полный правильный код..."
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 mt-6">
          <Button type="submit" disabled={loading}>
            {loading ? "Создание..." : "Создать puzzle"}
          </Button>
          <Link href="/tracks">
            <Button type="button" variant="outline">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

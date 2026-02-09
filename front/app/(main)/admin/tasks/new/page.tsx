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
import { createTask } from "@/lib/api/tasks";
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import type { TestCase } from "@/lib/types";

const defaultTestCase: TestCase = {
  id: "1",
  input: "",
  expectedOutput: "",
  isPublic: true,
};

export default function NewTaskPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [starterCode, setStarterCode] = useState('print("Hello, World!")');
  const [testCases, setTestCases] = useState<TestCase[]>([
    { ...defaultTestCase, id: "1" },
  ]);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function addTestCase() {
    setTestCases((prev) => [
      ...prev,
      { ...defaultTestCase, id: String(Date.now()) },
    ]);
  }

  function updateTestCase(id: string, patch: Partial<TestCase>) {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, ...patch } : tc))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Ошибка", description: "Введите название задачи", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const task = await createTask({
        title: title.trim(),
        description: description.trim(),
        starterCode,
        testCases,
        visibleGroupIds: visibleGroupIds.length > 0 ? visibleGroupIds : undefined,
      });
      toast({ title: "Задача создана", description: task.title });
      router.push(`/tasks/${task.id}`);
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось создать задачу",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Создание задачи</h1>
        <p className="text-muted-foreground mt-1">
          Заполните поля и добавьте тесты для проверки решений.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Основное</CardTitle>
            <CardDescription>Название и описание задачи</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Сумма двух чисел"
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
            <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Шаблон кода</CardTitle>
            <CardDescription>Начальный код, который увидит ученик</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeEditor value={starterCode} onChange={setStarterCode} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Тесты</CardTitle>
            <CardDescription>Ввод и ожидаемый вывод для каждого теста</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {testCases.map((tc) => (
              <div
                key={tc.id}
                className="rounded-lg border p-4 space-y-2 grid gap-2 sm:grid-cols-2"
              >
                <div className="space-y-1">
                  <Label>Ввод</Label>
                  <Input
                    value={tc.input}
                    onChange={(e) => updateTestCase(tc.id, { input: e.target.value })}
                    placeholder="например: 1 2"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ожидаемый вывод</Label>
                  <Input
                    value={tc.expectedOutput}
                    onChange={(e) =>
                      updateTestCase(tc.id, { expectedOutput: e.target.value })
                    }
                    placeholder="например: 3"
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
              Добавить тест
            </Button>
          </CardContent>
        </Card>
        <div className="flex flex-wrap gap-3 mt-6">
          <Button type="submit" disabled={loading}>
            {loading ? "Создание..." : "Создать задачу"}
          </Button>
          <Link href="/tracks">
            <Button type="button" variant="outline">Отмена</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

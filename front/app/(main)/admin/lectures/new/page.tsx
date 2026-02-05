"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createLecture } from "@/lib/api/lectures";
import { useToast } from "@/components/ui/use-toast";
import type { LectureBlock } from "@/lib/types";
import { BlockEditorText } from "@/components/lecture-blocks/block-editor-text";
import { BlockEditorImage } from "@/components/lecture-blocks/block-editor-image";
import { BlockEditorCode } from "@/components/lecture-blocks/block-editor-code";
import { Type, Image, Code, Plus, ChevronUp, ChevronDown } from "lucide-react";

const newTextBlock = (): Extract<LectureBlock, { type: "text" }> => ({
  type: "text",
  content: "",
});
const newImageBlock = (): Extract<LectureBlock, { type: "image" }> => ({
  type: "image",
  url: "",
  alt: "",
});
const newCodeBlock = (): Extract<LectureBlock, { type: "code" }> => ({
  type: "code",
  explanation: "",
  code: "",
  language: "python",
});

export default function NewLecturePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<LectureBlock[]>([]);
  const [loading, setLoading] = useState(false);

  function addBlock(type: "text" | "image" | "code") {
    if (type === "text") setBlocks((prev) => [...prev, newTextBlock()]);
    if (type === "image") setBlocks((prev) => [...prev, newImageBlock()]);
    if (type === "code") setBlocks((prev) => [...prev, newCodeBlock()]);
  }

  function updateBlock(index: number, block: LectureBlock) {
    setBlocks((prev) =>
      prev.map((b, i) => (i === index ? block : b))
    );
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, dir: "up" | "down") {
    if (dir === "up" && index === 0) return;
    if (dir === "down" && index === blocks.length - 1) return;
    const next = [...blocks];
    const j = dir === "up" ? index - 1 : index + 1;
    [next[index], next[j]] = [next[j], next[index]];
    setBlocks(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название лекции",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const lecture = await createLecture({
        title: title.trim(),
        blocks: blocks.length > 0 ? blocks : undefined,
      });
      toast({ title: "Лекция создана", description: lecture.title });
      router.push(`/lectures/${lecture.id}`);
    } catch (e) {
      toast({
        title: "Ошибка",
        description:
          e instanceof Error ? e.message : "Не удалось создать лекцию",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Создание лекции
        </h1>
        <p className="text-muted-foreground mt-1">
          Укажите название и добавьте блоки: текст (с форматированием), изображения или код с пояснением и кнопкой «Запустить».
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Основное</CardTitle>
            <CardDescription>Название лекции</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Введение в циклы"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Блоки лекции</CardTitle>
            <CardDescription>
              Добавляйте блоки текста, изображений и кода. Порядок можно менять.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addBlock("text")}
                className="gap-2"
              >
                <Type className="h-4 w-4" />
                Текст
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addBlock("image")}
                className="gap-2"
              >
                <Image className="h-4 w-4" />
                Изображение
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addBlock("code")}
                className="gap-2"
              >
                <Code className="h-4 w-4" />
                Код
              </Button>
            </div>

            <div className="space-y-4">
              {blocks.map((block, index) => (
                <div key={index} className="relative">
                  <div className="absolute left-0 top-2 flex flex-col gap-0.5 z-10 -ml-10">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveBlock(index, "up")}
                      disabled={index === 0}
                      title="Поднять"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveBlock(index, "down")}
                      disabled={index === blocks.length - 1}
                      title="Опустить"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="pl-2">
                    {block.type === "text" && (
                      <BlockEditorText
                        block={block}
                        onChange={(content) =>
                          updateBlock(index, { ...block, content })
                        }
                        onRemove={() => removeBlock(index)}
                      />
                    )}
                    {block.type === "image" && (
                      <BlockEditorImage
                        block={block}
                        onChange={(url, alt) =>
                          updateBlock(index, { ...block, url, alt })
                        }
                        onRemove={() => removeBlock(index)}
                      />
                    )}
                    {block.type === "code" && (
                      <BlockEditorCode
                        block={block}
                        onChange={(explanation, code) =>
                          updateBlock(index, { ...block, explanation, code })
                        }
                        onRemove={() => removeBlock(index)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
            {blocks.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                Нажмите «Текст», «Изображение» или «Код», чтобы добавить первый блок.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 mt-6">
          <Button type="submit" disabled={loading}>
            {loading ? "Создание..." : "Создать лекцию"}
          </Button>
          <Link href="/tracks">
            <Button type="button" variant="outline">
              Отмена
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

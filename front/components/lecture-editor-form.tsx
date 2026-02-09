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
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import type { LectureBlock } from "@/lib/types";
import { BlockEditorText } from "@/components/lecture-blocks/block-editor-text";
import { BlockEditorImage } from "@/components/lecture-blocks/block-editor-image";
import { BlockEditorCode } from "@/components/lecture-blocks/block-editor-code";
import { BlockEditorQuestion } from "@/components/lecture-blocks/block-editor-question";
import { BlockEditorVideo } from "@/components/lecture-blocks/block-editor-video";
import { Type, Image, Code, HelpCircle, Video, ChevronUp, ChevronDown } from "lucide-react";

function genBlockId() {
  return "q" + Math.random().toString(36).slice(2, 10);
}

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
const newQuestionBlock = (): Extract<LectureBlock, { type: "question" }> => ({
  type: "question",
  id: genBlockId(),
  title: "",
  prompt: "",
  choices: [{ id: "c1", text: "" }, { id: "c2", text: "" }],
  multiple: false,
});
const newVideoBlock = (): Extract<LectureBlock, { type: "video" }> => ({
  type: "video",
  id: genBlockId(),
  url: "",
  pause_points: [],
});

interface LectureEditorFormProps {
  mode: "create" | "edit";
  initialTitle?: string;
  initialBlocks?: LectureBlock[];
  initialVisibleGroupIds?: string[];
  lectureId?: string;
  onCreate: (data: { title: string; blocks: LectureBlock[]; visibleGroupIds: string[] }) => Promise<{ id: string }>;
  onUpdate: (data: { title: string; blocks: LectureBlock[]; visibleGroupIds: string[] }) => Promise<void>;
}

export function LectureEditorForm({
  mode,
  initialTitle = "",
  initialBlocks = [],
  initialVisibleGroupIds = [],
  lectureId,
  onCreate,
  onUpdate,
}: LectureEditorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(initialTitle);
  const [blocks, setBlocks] = useState<LectureBlock[]>(initialBlocks);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>(initialVisibleGroupIds);
  const [loading, setLoading] = useState(false);

  function addBlock(type: "text" | "image" | "code" | "question" | "video") {
    if (type === "text") setBlocks((prev) => [...prev, newTextBlock()]);
    if (type === "image") setBlocks((prev) => [...prev, newImageBlock()]);
    if (type === "code") setBlocks((prev) => [...prev, newCodeBlock()]);
    if (type === "question") setBlocks((prev) => [...prev, newQuestionBlock()]);
    if (type === "video") setBlocks((prev) => [...prev, newVideoBlock()]);
  }

  function updateBlock(index: number, block: LectureBlock) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)));
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
      const data = {
        title: title.trim(),
        blocks: blocks.length > 0 ? blocks : undefined,
        visibleGroupIds: visibleGroupIds.length > 0 ? visibleGroupIds : [],
      };
      if (mode === "create") {
        const created = await onCreate(data);
        toast({ title: "Лекция создана", description: title.trim() });
        router.push(`/lectures/${created.id}`);
      } else {
        await onUpdate(data);
        toast({ title: "Лекция сохранена", description: title.trim() });
        await router.push(lectureId ? `/lectures/${lectureId}` : "/tracks");
        router.refresh();
      }
    } catch (e) {
      toast({
        title: "Ошибка",
        description: e instanceof Error ? e.message : "Не удалось сохранить лекцию",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Основное</CardTitle>
          <CardDescription>Название лекции</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Блоки лекции</CardTitle>
          <CardDescription>
            Добавляйте блоки: текст, изображения, код, вопросы. Вопросы встраиваются в лекцию на выбранной позиции.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("text")} className="gap-2">
              <Type className="h-4 w-4" />
              Текст
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("image")} className="gap-2">
              <Image className="h-4 w-4" />
              Изображение
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("code")} className="gap-2">
              <Code className="h-4 w-4" />
              Код
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("question")} className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Вопрос
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addBlock("video")} className="gap-2">
              <Video className="h-4 w-4" />
              Видео
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
                      onChange={(content) => updateBlock(index, { ...block, content })}
                      onRemove={() => removeBlock(index)}
                    />
                  )}
                  {block.type === "image" && (
                    <BlockEditorImage
                      block={block}
                      onChange={(url, alt) => updateBlock(index, { ...block, url, alt })}
                      onRemove={() => removeBlock(index)}
                    />
                  )}
                  {block.type === "code" && (
                    <BlockEditorCode
                      block={block}
                      onChange={(explanation, code) => updateBlock(index, { ...block, explanation, code })}
                      onRemove={() => removeBlock(index)}
                    />
                  )}
                  {block.type === "question" && (
                    <BlockEditorQuestion
                      block={block}
                      onChange={(b) => updateBlock(index, b)}
                      onRemove={() => removeBlock(index)}
                    />
                  )}
                  {block.type === "video" && (
                    <BlockEditorVideo
                      block={block}
                      onChange={(b) => updateBlock(index, b)}
                      onRemove={() => removeBlock(index)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          {blocks.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              Нажмите «Текст», «Изображение», «Код» или «Вопрос», чтобы добавить блок.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 mt-6">
        <Button type="submit" disabled={loading}>
          {loading ? (mode === "create" ? "Создание..." : "Сохранение...") : mode === "create" ? "Создать лекцию" : "Сохранить"}
        </Button>
        <Link href={lectureId ? `/lectures/${lectureId}` : "/tracks"}>
          <Button type="button" variant="outline">
            Отмена
          </Button>
        </Link>
      </div>
    </form>
  );
}

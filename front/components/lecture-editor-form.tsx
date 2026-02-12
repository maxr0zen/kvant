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
import { useToast } from "@/components/ui/use-toast";
import { GroupSelector } from "@/components/group-selector";
import { datetimeLocalToISOUTC } from "@/lib/utils/datetime";
import type { LectureBlock } from "@/lib/types";
import { BlockEditorText } from "@/components/lecture-blocks/block-editor-text";
import { BlockEditorImage } from "@/components/lecture-blocks/block-editor-image";
import { BlockEditorCode } from "@/components/lecture-blocks/block-editor-code";
import { BlockEditorQuestion } from "@/components/lecture-blocks/block-editor-question";
import { BlockEditorVideo } from "@/components/lecture-blocks/block-editor-video";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Type, Image, Code, HelpCircle, Video, ChevronUp, ChevronDown, Settings2, Plus, Trash2 } from "lucide-react";

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
  initialHints?: string[];
  initialAvailableFrom?: string;
  initialAvailableUntil?: string;
  initialMaxAttempts?: string;
  lectureId?: string;
  /** Если задано, после создания редирект на страницу трека с параметрами добавленного урока */
  redirectToTrackAfterCreate?: { trackId: string };
  onCreate: (data: {
    title: string;
    blocks: LectureBlock[];
    visibleGroupIds: string[];
    hints?: string[];
    availableFrom?: string | null;
    availableUntil?: string | null;
    maxAttempts?: number | null;
  }) => Promise<{ id: string }>;
  onUpdate: (data: {
    title: string;
    blocks: LectureBlock[];
    visibleGroupIds: string[];
    hints?: string[];
    availableFrom?: string | null;
    availableUntil?: string | null;
    maxAttempts?: number | null;
  }) => Promise<void>;
}

export function LectureEditorForm({
  mode,
  initialTitle = "",
  initialBlocks = [],
  initialVisibleGroupIds = [],
  initialHints = [],
  initialAvailableFrom = "",
  initialAvailableUntil = "",
  initialMaxAttempts = "",
  lectureId,
  redirectToTrackAfterCreate,
  onCreate,
  onUpdate,
}: LectureEditorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(initialTitle);
  const [blocks, setBlocks] = useState<LectureBlock[]>(initialBlocks);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>(initialVisibleGroupIds);
  const [hints, setHints] = useState<string[]>(initialHints.length > 0 ? initialHints : [""]);
  const [tempMode, setTempMode] = useState<"none" | "until_date" | "duration">(
    initialAvailableFrom || initialAvailableUntil ? "until_date" : "none"
  );
  const [availableFrom, setAvailableFrom] = useState(initialAvailableFrom);
  const [availableUntil, setAvailableUntil] = useState(initialAvailableUntil);
  const [durationHours, setDurationHours] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(initialMaxAttempts);
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

  function getEffectiveAvailableFromUntil(): { from: string | null; until: string | null } {
    if (tempMode === "none") return { from: null, until: null };
    if (tempMode === "until_date") {
      const from = availableFrom.trim() ? datetimeLocalToISOUTC(availableFrom.trim()) : null;
      const until = availableUntil.trim() ? datetimeLocalToISOUTC(availableUntil.trim()) : null;
      return { from: from || null, until: until || null };
    }
    if (tempMode === "duration") {
      const h = parseInt(durationHours, 10) || 0;
      const m = parseInt(durationMinutes, 10) || 0;
      if (h === 0 && m === 0) return { from: null, until: null };
      const now = new Date();
      const until = new Date(now.getTime() + h * 60 * 60 * 1000 + m * 60 * 1000);
      return { from: now.toISOString(), until: until.toISOString() };
    }
    return { from: null, until: null };
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
      const { from: effFrom, until: effUntil } = getEffectiveAvailableFromUntil();
      const hintsFiltered = hints.filter((h) => h.trim() !== "");
      const maxAttemptsNum = maxAttempts.trim() ? parseInt(maxAttempts, 10) : null;
      const data = {
        title: title.trim(),
        blocks,
        visibleGroupIds: visibleGroupIds.length > 0 ? visibleGroupIds : [],
        hints: hintsFiltered.length > 0 ? hintsFiltered : undefined,
        availableFrom: effFrom,
        availableUntil: effUntil,
        maxAttempts: maxAttemptsNum ?? undefined,
      };
      if (mode === "create") {
        const created = await onCreate(data);
        toast({ title: "Лекция создана", description: title.trim() });
        if (redirectToTrackAfterCreate) {
          router.push(
            `/main/${redirectToTrackAfterCreate.trackId}?added=lecture&id=${encodeURIComponent(created.id)}&title=${encodeURIComponent(data.title)}&type=lecture`
          );
        } else {
          router.push(`/lectures/${created.id}`);
        }
      } else {
        await onUpdate(data);
        toast({ title: "Лекция сохранена", description: title.trim() });
        await router.push(lectureId ? `/lectures/${lectureId}` : "/main");
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
      <Card className="shadow-sm border-border/80">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">Основное</CardTitle>
              <CardDescription className="text-sm">Название лекции. Дополнительные настройки — в кнопке справа.</CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-2 rounded-lg">
                  <Settings2 className="h-4 w-4" />
                  Дополнительное
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle>Дополнительное</DialogTitle>
                  <CardDescription className="text-sm">
                    Группы, подсказки, сроки, ограничение попыток
                  </CardDescription>
                </DialogHeader>
                <div className="space-y-0 pt-2">
                  <div className="pb-5">
                    <GroupSelector value={visibleGroupIds} onChange={setVisibleGroupIds} />
                  </div>
                  <div className="border-t border-border/60 pt-5 pb-5 space-y-2">
                    <Label>Подсказки</Label>
                    <p className="text-xs text-muted-foreground">Ученик открывает по порядку</p>
                    {hints.map((h, i) => (
                      <div key={i} className="flex gap-2">
                        <Textarea
                          value={h}
                          onChange={(e) => setHints((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                          placeholder={`Подсказка ${i + 1}`}
                          rows={2}
                          className="flex-1 text-sm rounded-lg resize-y"
                        />
                        <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-lg" onClick={() => setHints((prev) => prev.filter((_, j) => j !== i))} title="Удалить подсказку">
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setHints((prev) => [...prev, ""])} className="rounded-lg">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Добавить подсказку
                    </Button>
                  </div>
                  <div className="border-t border-border/60 pt-5 pb-5 space-y-2">
                    <Label>Временное задание</Label>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/60 transition-colors">
                        <input type="radio" name="tempMode" checked={tempMode === "none"} onChange={() => setTempMode("none")} className="rounded-full border-input" />
                        Всегда доступно
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/60 transition-colors">
                        <input type="radio" name="tempMode" checked={tempMode === "until_date"} onChange={() => setTempMode("until_date")} className="rounded-full border-input" />
                        До даты
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer rounded-md py-2 px-3 hover:bg-muted/60 transition-colors">
                        <input type="radio" name="tempMode" checked={tempMode === "duration"} onChange={() => setTempMode("duration")} className="rounded-full border-input" />
                        По длительности
                      </label>
                    </div>
                    {tempMode === "until_date" && (
                      <div className="grid gap-2 sm:grid-cols-2 pt-1">
                        <div className="space-y-1">
                          <Label className="text-xs">Доступно с</Label>
                          <Input type="datetime-local" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className="text-sm h-9 rounded-lg" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Доступно до</Label>
                          <Input type="datetime-local" value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} className="text-sm h-9 rounded-lg" />
                        </div>
                      </div>
                    )}
                    {tempMode === "duration" && (
                      <div className="flex gap-3 items-end pt-1">
                        <div className="space-y-1">
                          <Label className="text-xs">Часы</Label>
                          <Input type="number" min={0} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} placeholder="0" className="w-20 h-9 text-sm rounded-lg" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Минуты</Label>
                          <Input type="number" min={0} max={59} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="0" className="w-20 h-9 text-sm rounded-lg" />
                        </div>
                        <p className="text-xs text-muted-foreground pb-2">Доступно с текущего момента</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border/60 pt-5 space-y-1">
                    <Label htmlFor="lecture-maxAttempts">Ограничение попыток</Label>
                    <Input
                      id="lecture-maxAttempts"
                      type="number"
                      min={1}
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(e.target.value)}
                      placeholder="Не задано — неограниченно"
                      className="max-w-[140px] h-9 text-sm rounded-lg"
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="title" className="font-medium">Название лекции</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Введение в циклы"
              required
              className="max-w-xl rounded-lg h-10 text-base"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Блоки лекции</CardTitle>
          <CardDescription className="text-sm">
            Добавляйте блоки по порядку. Порядок можно менять стрелками слева от блока.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Добавить блок</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("text")} className="gap-2 rounded-lg shrink-0">
                <Type className="h-4 w-4" />
                Текст
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("image")} className="gap-2 rounded-lg shrink-0">
                <Image className="h-4 w-4" />
                Изображение
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("code")} className="gap-2 rounded-lg shrink-0">
                <Code className="h-4 w-4" />
                Код
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("question")} className="gap-2 rounded-lg shrink-0">
                <HelpCircle className="h-4 w-4" />
                Вопрос
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("video")} className="gap-2 rounded-lg shrink-0">
                <Video className="h-4 w-4" />
                Видео
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {blocks.map((block, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex flex-col gap-0.5 shrink-0 pt-1">
                  <span className="text-xs font-medium text-muted-foreground w-6 text-center tabular-nums">{index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => moveBlock(index, "up")}
                    disabled={index === 0}
                    title="Поднять выше"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => moveBlock(index, "down")}
                    disabled={index === blocks.length - 1}
                    title="Опустить ниже"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
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
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 py-12">
              <div className="flex flex-col gap-2 text-muted-foreground">
                <Plus className="h-10 w-10 opacity-50" />
                <p className="text-sm font-medium">Пока нет блоков</p>
                <p className="text-xs max-w-sm">Выберите тип блока выше (Текст, Изображение, Код, Вопрос или Видео), чтобы добавить первый блок лекции.</p>
              </div>
            </div>
          )}

          {blocks.length > 0 && (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("text")} className="gap-1.5 rounded-lg text-muted-foreground">
                <Type className="h-3.5 w-3.5" /> Текст
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("image")} className="gap-1.5 rounded-lg text-muted-foreground">
                <Image className="h-3.5 w-3.5" /> Изображение
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("code")} className="gap-1.5 rounded-lg text-muted-foreground">
                <Code className="h-3.5 w-3.5" /> Код
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("question")} className="gap-1.5 rounded-lg text-muted-foreground">
                <HelpCircle className="h-3.5 w-3.5" /> Вопрос
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addBlock("video")} className="gap-1.5 rounded-lg text-muted-foreground">
                <Video className="h-3.5 w-3.5" /> Видео
              </Button>
              <span className="text-xs text-muted-foreground self-center ml-1">— добавить ещё</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={loading} className="rounded-lg min-w-[180px]">
          {loading ? (mode === "create" ? "Создание…" : "Сохранение…") : mode === "create" ? "Создать лекцию" : "Сохранить"}
        </Button>
        <Link href={lectureId ? `/lectures/${lectureId}` : "/main"}>
          <Button type="button" variant="outline" className="rounded-lg">
            Отмена
          </Button>
        </Link>
      </div>
    </form>
  );
}

"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Video, Plus } from "lucide-react";
import type { LectureBlock, VideoPausePoint } from "@/lib/types";

type VideoBlock = Extract<LectureBlock, { type: "video" }>;

interface ChoiceWithCorrect {
  id: string;
  text: string;
  is_correct?: boolean;
}

interface BlockEditorVideoProps {
  block: VideoBlock;
  onChange: (block: VideoBlock) => void;
  onRemove: () => void;
}

function genId() {
  return "c" + Math.random().toString(36).slice(2, 10);
}

function genPauseId() {
  return "pp" + Math.random().toString(36).slice(2, 10);
}

/** Парсит таймкод: ч:мм:сс, мм:сс или сс → секунды. Пустые части = 0. */
function parseTimestamp(input: string): number {
  const s = String(input || "").trim();
  if (!s) return 0;
  const parts = s.split(":").map((p) => {
    const v = p.trim();
    return v === "" ? 0 : parseInt(v, 10);
  });
  if (parts.some((n) => isNaN(n) || n < 0)) return 0;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length >= 3) return parts[0] * 3600 + parts[1] * 60 + (parts[2] ?? 0);
  return 0;
}

/** Секунды → строка ч:мм:сс или мм:сс или сс */
function formatTimestamp(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  if (sec === 0) return "0";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  if (m > 0) return `${m}:${s.toString().padStart(2, "0")}`;
  return String(s);
}

export function BlockEditorVideo({ block, onChange, onRemove }: BlockEditorVideoProps) {
  const pausePoints = block.pause_points ?? [];

  function addPausePoint() {
    const pp: VideoPausePoint = {
      id: genPauseId(),
      timestamp: 0,
      question: {
        id: genId(),
        title: "",
        prompt: "",
        choices: [{ id: genId(), text: "", is_correct: true }, { id: genId(), text: "", is_correct: false }],
        multiple: false,
      },
    };
    onChange({ ...block, pause_points: [...pausePoints, pp] });
  }

  function addChoice(ppIndex: number) {
    const pp = pausePoints[ppIndex];
    const choices = (pp.question.choices || []) as ChoiceWithCorrect[];
    const newChoice: ChoiceWithCorrect = { id: genId(), text: "", is_correct: false };
    updatePauseQuestion(ppIndex, { choices: [...choices, newChoice] });
  }

  function removeChoice(ppIndex: number, choiceIndex: number) {
    const pp = pausePoints[ppIndex];
    const choices = (pp.question.choices || []) as ChoiceWithCorrect[];
    if (choices.length <= 1) return;
    const next = choices.filter((_, j) => j !== choiceIndex);
    updatePauseQuestion(ppIndex, { choices: next });
  }

  function updatePausePoint(index: number, patch: Partial<VideoPausePoint>) {
    const next = pausePoints.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange({ ...block, pause_points: next });
  }

  function updatePauseQuestion(index: number, qPatch: Partial<VideoPausePoint["question"]>) {
    const next = pausePoints.map((p, i) =>
      i === index ? { ...p, question: { ...p.question, ...qPatch } } : p
    );
    onChange({ ...block, pause_points: next });
  }

  function updateChoice(ppIndex: number, choiceIndex: number, patch: Partial<ChoiceWithCorrect>) {
    const pp = pausePoints[ppIndex];
    const choices = (pp.question.choices || []) as ChoiceWithCorrect[];
    const nextChoices = choices.map((c, j) => (j === choiceIndex ? { ...c, ...patch } : c));
    updatePauseQuestion(ppIndex, { choices: nextChoices });
  }

  function toggleCorrect(ppIndex: number, choiceIndex: number) {
    const pp = pausePoints[ppIndex];
    const choices = (pp.question.choices || []) as ChoiceWithCorrect[];
    const c = choices[choiceIndex];
    if (pp.question.multiple) {
      updateChoice(ppIndex, choiceIndex, { is_correct: !c.is_correct });
    } else {
      const next = choices.map((ch, i) => ({ ...ch, is_correct: i === choiceIndex }));
      updatePauseQuestion(ppIndex, { choices: next });
    }
  }

  function removePausePoint(index: number) {
    onChange({ ...block, pause_points: pausePoints.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-card">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-muted-foreground text-xs font-medium flex items-center gap-1">
          <Video className="h-4 w-4" /> Блок: Видео
        </Label>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} title="Удалить блок">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="space-y-2">
        <Label>Ссылка на видео</Label>
        <p className="text-xs text-muted-foreground">
          На данный момент доступны ролики только из Rutube
        </p>
        <Input
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="https://rutube.ru/video/..."
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Таймкоды с вопросами</Label>
          <Button type="button" variant="outline" size="sm" onClick={addPausePoint} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Добавить таймкод
          </Button>
        </div>
        {pausePoints.map((pp, ppIndex) => (
          <div key={pp.id} className="rounded-lg border p-3 space-y-2 bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Таймкод</Label>
                <Input
                  type="text"
                  value={formatTimestamp(pp.timestamp)}
                  onChange={(e) => updatePausePoint(ppIndex, { timestamp: parseTimestamp(e.target.value) })}
                  placeholder="сс, мм:сс или ч:мм:сс"
                  className="w-28"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removePausePoint(ppIndex)}
                title="Удалить таймкод"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Вопрос</Label>
              <Input
                value={pp.question.title}
                onChange={(e) => updatePauseQuestion(ppIndex, { title: e.target.value })}
                placeholder="Текст вопроса"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`mult-${pp.id}`}
                checked={!!pp.question.multiple}
                onChange={(e) => updatePauseQuestion(ppIndex, { multiple: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor={`mult-${pp.id}`} className="text-xs font-normal cursor-pointer">
                Можно выбрать несколько ответов
              </Label>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Варианты ответа</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addChoice(ppIndex)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Добавить
                </Button>
              </div>
              {(pp.question.choices || []).map((c, ci) => (
                <div key={c.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!(c as ChoiceWithCorrect).is_correct}
                    onChange={() => toggleCorrect(ppIndex, ci)}
                    title="Правильный"
                    className="rounded"
                  />
                  <Input
                    value={c.text}
                    onChange={(e) => updateChoice(ppIndex, ci, { text: e.target.value })}
                    placeholder={`Вариант ${ci + 1}`}
                    className="flex-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeChoice(ppIndex, ci)}
                    title="Удалить"
                    disabled={(pp.question.choices || []).length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

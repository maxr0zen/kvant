"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, HelpCircle, Plus } from "lucide-react";
import type { LectureBlock } from "@/lib/types";

type QuestionBlock = Extract<LectureBlock, { type: "question" }>;

interface ChoiceWithCorrect {
  id: string;
  text: string;
  is_correct?: boolean;
}

interface BlockEditorQuestionProps {
  block: QuestionBlock;
  onChange: (block: QuestionBlock & { choices: ChoiceWithCorrect[] }) => void;
  onRemove: () => void;
}

function genId() {
  return "c" + Math.random().toString(36).slice(2, 10);
}

export function BlockEditorQuestion({
  block,
  onChange,
  onRemove,
}: BlockEditorQuestionProps) {
  const choices = (block.choices || []) as ChoiceWithCorrect[];

  function updateChoice(index: number, patch: Partial<ChoiceWithCorrect>) {
    const next = choices.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange({ ...block, choices: next });
  }

  function addChoice() {
    onChange({ ...block, choices: [...choices, { id: genId(), text: "", is_correct: false }] });
  }

  function removeChoice(index: number) {
    onChange({ ...block, choices: choices.filter((_, i) => i !== index) });
  }

  function toggleCorrect(index: number) {
    const c = choices[index];
    if (block.multiple) {
      updateChoice(index, { is_correct: !c.is_correct });
    } else {
      const next = choices.map((ch, i) => ({
        ...ch,
        is_correct: i === index ? true : false,
      }));
      onChange({ ...block, choices: next });
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4 bg-card">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-muted-foreground text-xs font-medium flex items-center gap-1">
          <HelpCircle className="h-4 w-4" /> Блок: Вопрос
        </Label>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} title="Удалить блок">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      <div className="space-y-2">
        <Label>Вопрос</Label>
        <Input
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Текст вопроса"
        />
      </div>
      <div className="space-y-2">
        <Label>Подсказка (опционально)</Label>
        <Input
          value={block.prompt}
          onChange={(e) => onChange({ ...block, prompt: e.target.value })}
          placeholder="Дополнительное пояснение"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="mult"
          checked={block.multiple}
          onChange={(e) => onChange({ ...block, multiple: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="mult" className="text-sm font-normal cursor-pointer">
          Можно выбрать несколько ответов
        </Label>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Варианты ответа</Label>
          <Button type="button" variant="outline" size="sm" onClick={addChoice} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Добавить
          </Button>
        </div>
        <div className="space-y-2">
          {choices.map((c, i) => (
            <div key={c.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!c.is_correct}
                onChange={() => toggleCorrect(i)}
                title="Правильный ответ"
                className="rounded"
              />
              <Input
                value={c.text}
                onChange={(e) => updateChoice(i, { text: e.target.value })}
                placeholder={`Вариант ${i + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeChoice(i)}
                title="Удалить"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

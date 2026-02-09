"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { fetchGroups, type GroupItem } from "@/lib/api/groups";

interface GroupSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function GroupSelector({ value, onChange, disabled }: GroupSelectorProps) {
  const [groups, setGroups] = useState<GroupItem[]>([]);

  useEffect(() => {
    fetchGroups().then(setGroups);
  }, []);

  function toggleGroup(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  }

  function toggleAll(visibleToAll: boolean) {
    onChange(visibleToAll ? [] : groups.map((g) => g.id));
  }

  const visibleToAll = value.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Область видимости</Label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={visibleToAll}
            onChange={(e) => toggleAll(e.target.checked)}
            disabled={disabled}
            className="rounded"
          />
          <span>Доступно всем</span>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Пустой список — доступно всем. Выберите группы, которым будет доступен контент.
      </p>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Нет групп. Создайте группы в разделе «Группы».</p>
      ) : (
        <div className="flex flex-wrap gap-3 pt-1">
          {groups.map((g) => (
            <label
              key={g.id}
              className="flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={value.includes(g.id)}
                onChange={() => toggleGroup(g.id)}
                disabled={disabled}
                className="rounded"
              />
              <span className="text-sm">{g.title}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

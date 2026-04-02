"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { fetchAchievementsCatalog, type AchievementCatalogItem } from "@/lib/api/achievements";

export function AchievementSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [items, setItems] = useState<AchievementCatalogItem[]>([]);
  const selected = useMemo(() => new Set(value), [value]);

  useEffect(() => {
    let cancelled = false;
    fetchAchievementsCatalog().then((list) => {
      if (!cancelled) setItems(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string, checked: boolean) {
    if (checked) {
      onChange(Array.from(new Set([...value, id])));
      return;
    }
    onChange(value.filter((x) => x !== id));
  }

  return (
    <div className="space-y-2 border-t pt-5">
      <Label>Награда за выполнение</Label>
      <p className="text-xs text-muted-foreground">
        Выберите достижения, которые ученик получит при успешном выполнении.
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Каталог достижений пока пуст.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm hover:bg-muted/40"
            >
              <input
                type="checkbox"
                className="mt-0.5 rounded border-input"
                checked={selected.has(item.id)}
                onChange={(e) => toggle(item.id, e.target.checked)}
              />
              <span className="text-base leading-5">{item.icon}</span>
              <span className="min-w-0">
                <span className="block font-medium">{item.title}</span>
                <span className="block text-xs text-muted-foreground">{item.description}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

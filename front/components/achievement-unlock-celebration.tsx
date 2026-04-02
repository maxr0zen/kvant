"use client";

import { useEffect, useMemo, useState } from "react";
import type { AchievementUnlocked } from "@/lib/types";

export function AchievementUnlockCelebration({
  items,
  onDone,
}: {
  items: AchievementUnlocked[];
  onDone?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const first = items[0];
  const extraCount = Math.max(0, items.length - 1);
  const confetti = useMemo(() => Array.from({ length: 14 }, (_, i) => i), []);

  useEffect(() => {
    if (!items.length) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3800);
    return () => clearTimeout(t);
  }, [items, onDone]);

  if (!visible || !first) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-start sm:justify-end sm:p-6">
      <div className="achievement-pop pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border bg-background/95 p-4 shadow-2xl backdrop-blur">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-2xl dark:bg-amber-900/40">
            {first.icon || "🏆"}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">Новое достижение</p>
            <p className="truncate text-base font-semibold">{first.title}</p>
            <p className="truncate text-xs text-muted-foreground">{first.description}</p>
          </div>
        </div>
        {extraCount > 0 && (
          <p className="text-xs text-muted-foreground">И еще {extraCount} достиж. получено.</p>
        )}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {confetti.map((i) => (
            <span
              key={i}
              className="achievement-confetti absolute top-[-10px] h-2 w-2 rounded-sm"
              style={{
                left: `${6 + i * 6.2}%`,
                animationDelay: `${(i % 5) * 80}ms`,
                background: i % 3 === 0 ? "#f59e0b" : i % 3 === 1 ? "#22c55e" : "#3b82f6",
              }}
            />
          ))}
        </div>
      </div>
      <style jsx>{`
        .achievement-pop {
          animation: ach-pop 0.45s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .achievement-confetti {
          animation: ach-fall 1.3s ease-in forwards;
        }
        @keyframes ach-pop {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes ach-fall {
          0% {
            transform: translateY(-8px) rotate(0deg);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          100% {
            transform: translateY(92px) rotate(260deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

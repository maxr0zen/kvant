"use client";

import { useEffect, useState, useCallback } from "react";
import { Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AchievementUnlocked } from "@/lib/types";

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    left: `${Math.random() * 100}%`,
    size: 4 + Math.random() * 6,
    color: ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#ec4899", "#06b6d4"][i % 7],
    drift: Math.random() * 120 - 60,
  }));

  return (
    <div className="pointer-events-none fixed inset-0 z-[201] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="ach-confetti absolute top-[-12px] rounded-sm"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--ach-drift": `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function AchievementFullscreenCelebration({
  items,
  onDone,
}: {
  items: AchievementUnlocked[];
  onDone?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length > 0) {
      setVisible(true);
      setEntered(false);
      setCurrentIndex(0);
      requestAnimationFrame(() => setEntered(true));
    }
  }, [items]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setEntered(false);
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        requestAnimationFrame(() => setEntered(true));
      }, 300);
    } else {
      setEntered(false);
      setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 300);
    }
  }, [currentIndex, items.length, onDone]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      handleNext();
    }, 5000);
    return () => clearTimeout(timer);
  }, [visible, currentIndex, handleNext]);

  const current = items[currentIndex];

  if (!visible || !current) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-300 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
    >
      <Confetti />

      <div
        className={`relative z-[202] mx-4 flex w-full max-w-xl flex-col items-center rounded-[2rem] border border-amber-500/20 bg-card p-10 text-center shadow-2xl transition-all duration-300 ${
          entered ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-6"
        }`}
      >
        <button
          onClick={handleNext}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>

        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full bg-amber-500/15 text-6xl shadow-[0_0_60px_rgba(245,158,11,0.35)] transition-all duration-500 delay-150 ${
            entered ? "scale-100 rotate-0" : "scale-0 -rotate-180"
          }`}
        >
          {current.icon || "🏆"}
        </div>

        <p
          className={`mt-6 text-xs font-bold uppercase tracking-[0.3em] text-amber-500 transition-all duration-500 delay-200 ${
            entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          Достижение разблокировано
        </p>

        <h2
          className={`mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl transition-all duration-500 delay-300 ${
            entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          {current.title}
        </h2>

        <p
          className={`mt-3 max-w-sm text-base leading-relaxed text-muted-foreground transition-all duration-500 delay-400 ${
            entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          {current.description}
        </p>

        {items.length > 1 && (
          <p
            className={`mt-2 text-xs text-muted-foreground transition-all duration-500 delay-500 ${
              entered ? "opacity-100" : "opacity-0"
            }`}
          >
            {currentIndex + 1} из {items.length}
          </p>
        )}

        <div
          className={`mt-8 transition-all duration-500 delay-500 ${
            entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <Button
            onClick={handleNext}
            className="gap-2 rounded-full px-8 py-6 text-base shadow-lg transition-transform hover:scale-105"
          >
            <Trophy className="h-5 w-5" />
            {currentIndex < items.length - 1 ? "Следующее достижение" : "Продолжить"}
          </Button>
        </div>
      </div>

      <style jsx>{`
        .ach-confetti {
          animation-name: ach-confetti-fall;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }
        @keyframes ach-confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg) translateX(0);
            opacity: 1;
          }
          60% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg) translateX(var(--ach-drift, 0px));
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

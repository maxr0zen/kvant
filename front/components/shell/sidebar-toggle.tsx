"use client";

import { useRef, useCallback } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "./sidebar-context";

const SIDEBAR_WIDTH = 15 * 16; // 15rem = 240px
const SIDEBAR_COLLAPSED = 4.25 * 16; // 4.25rem = 68px
const SWIPE_THRESHOLD = 40;

export function SidebarToggle() {
  const { collapsed, setCollapsed, toggle } = useSidebar();
  const pointerStartX = useRef<number | null>(null);
  const gestureHandled = useRef(false);
  const zoneRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerStartX.current = e.clientX;
    zoneRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (pointerStartX.current === null) return;
      const dx = e.clientX - pointerStartX.current;
      if (Math.abs(dx) >= SWIPE_THRESHOLD) {
        gestureHandled.current = true;
        setCollapsed(dx < 0);
        pointerStartX.current = null;
      }
    },
    [setCollapsed]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    zoneRef.current?.releasePointerCapture(e.pointerId);
    pointerStartX.current = null;
    requestAnimationFrame(() => { gestureHandled.current = false; });
  }, []);

  const handleClick = useCallback(() => {
    if (gestureHandled.current) return;
    toggle();
  }, [toggle]);

  const left = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;
  const touchZoneWidth = 32;

  return (
    <div
      ref={zoneRef}
      role="presentation"
      className={
        "fixed top-14 bottom-0 z-40 flex items-center justify-center transition-[left] duration-200 ease-in-out hidden lg:flex"
      }
      style={{ left: `${left - 12}px`, width: `${touchZoneWidth}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <button
        type="button"
        onClick={handleClick}
        title={collapsed ? "Развернуть меню" : "Свернуть меню"}
        aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors active:scale-95 touch-manipulation"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

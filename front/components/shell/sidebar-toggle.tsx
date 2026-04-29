"use client";

import { useRef, useCallback } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "./sidebar-context";

const MIN_WIDTH = 5.25 * 16;
const MAX_WIDTH = 320;
const SNAP_THRESHOLD = 40;

export function SidebarToggle() {
  const { width, setWidth, toggle, isCollapsed } = useSidebar();
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const zoneRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Ignore if clicking the button itself
    if ((e.target as HTMLElement).closest("button")) return;

    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    zoneRef.current?.setPointerCapture(e.pointerId);
    zoneRef.current?.classList.add("cursor-col-resize");
  }, [width]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - startX.current;
      const newWidth = startWidth.current + dx;
      setWidth(newWidth);
    },
    [setWidth]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      zoneRef.current?.releasePointerCapture(e.pointerId);
      zoneRef.current?.classList.remove("cursor-col-resize");

      // Snap to nearest anchor if close enough
      const current = width;
      const mid = (MIN_WIDTH + MAX_WIDTH) / 2;

      if (Math.abs(current - MIN_WIDTH) < SNAP_THRESHOLD) {
        setWidth(MIN_WIDTH);
      } else if (Math.abs(current - MAX_WIDTH) < SNAP_THRESHOLD) {
        setWidth(MAX_WIDTH);
      } else if (Math.abs(current - mid) < SNAP_THRESHOLD) {
        setWidth(mid);
      }
      // Otherwise keep the current width (partial collapse)
    },
    [width, setWidth]
  );

  // Position the toggle button at the sidebar edge
  const left = width - 12;

  return (
    <div
      ref={zoneRef}
      role="presentation"
      className="fixed top-0 bottom-0 z-40 flex items-center justify-center transition-none hidden lg:flex"
      style={{ left, width: "24px" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <button
        type="button"
        onClick={toggle}
        title={isCollapsed ? "Развернуть меню" : "Свернуть меню"}
        aria-label={isCollapsed ? "Развернуть меню" : "Свернуть меню"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors active:scale-95 touch-manipulation"
      >
        {isCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

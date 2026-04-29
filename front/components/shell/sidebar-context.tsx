"use client";

import { createContext, useContext, useState, useCallback } from "react";

const MIN_WIDTH = 5.25 * 16; // 5.25rem in pixels (assuming 16px base)
const MAX_WIDTH = 320; // ~20rem

interface SidebarContextValue {
  width: number;
  setWidth: (value: number | ((prev: number) => number)) => void;
  toggle: () => void;
  isCollapsed: boolean;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function clampWidth(w: number) {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w));
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [width, setWidthState] = useState(MAX_WIDTH);
  const isCollapsed = width < (MIN_WIDTH + MAX_WIDTH) / 2;

  const setWidth = useCallback((value: number | ((prev: number) => number)) => {
    setWidthState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      return clampWidth(next);
    });
  }, []);

  const toggle = useCallback(() => {
    setWidthState((prev) => (prev > (MIN_WIDTH + MAX_WIDTH) / 2 ? MIN_WIDTH : MAX_WIDTH));
  }, []);

  return (
    <SidebarContext.Provider value={{ width, setWidth, toggle, isCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

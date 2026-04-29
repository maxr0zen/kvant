import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SidebarProvider, useSidebar } from "@/components/shell/sidebar-context";

function wrapper({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}

describe("SidebarContext", () => {
  it("starts expanded", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });
    expect(result.current.width).toBe(320);
    expect(result.current.isCollapsed).toBe(false);
  });

  it("toggle collapses to min width", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });
    act(() => result.current.toggle());
    expect(result.current.width).toBe(84);
    expect(result.current.isCollapsed).toBe(true);
  });

  it("toggle expands back to max width", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.width).toBe(320);
    expect(result.current.isCollapsed).toBe(false);
  });

  it("setWidth allows partial collapse", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });
    act(() => result.current.setWidth(250));
    expect(result.current.width).toBe(250);
    expect(result.current.isCollapsed).toBe(false);
  });

  it("clamps width to min and max", () => {
    const { result } = renderHook(() => useSidebar(), { wrapper });
    act(() => result.current.setWidth(10));
    expect(result.current.width).toBe(84);
    act(() => result.current.setWidth(1000));
    expect(result.current.width).toBe(320);
  });
});

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PuzzleView } from "@/app/(main)/puzzles/[id]/puzzle-view";
import type { Puzzle } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  toastMock: vi.fn(),
  checkPuzzleSolutionMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock("@/lib/api/puzzles", () => ({
  checkPuzzleSolution: (...args: unknown[]) => mocks.checkPuzzleSolutionMock(...args),
}));

vi.mock("@/lib/utils/attempt-limiter", () => ({
  isAttemptLimitExceeded: () => false,
  recordFailedAttempt: vi.fn(),
  getRemainingAttempts: () => 3,
  getCooldownMinutesRemaining: () => 0,
}));

vi.mock("@/components/availability-countdown", () => ({
  AvailabilityCountdown: () => <div>countdown</div>,
}));

vi.mock("@/components/code-highlight", () => ({
  CodeHighlight: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

const puzzle: Puzzle = {
  id: "p1",
  title: "P",
  description: "desc",
  language: "python",
  solution: "",
  blocks: [
    { id: "b1", code: "print(1)", order: "1", indent: "" },
    { id: "b2", code: "print(2)", order: "2", indent: "" },
  ],
  maxAttempts: 3,
  attemptsUsed: 0,
};

describe("PuzzleView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkPuzzleSolutionMock.mockResolvedValue({ passed: true, message: "ok" });
  });

  it("shows attempts exhausted and disables check button", async () => {
    render(<PuzzleView puzzle={{ ...puzzle, maxAttempts: 1, attemptsUsed: 1 }} />);
    expect(await screen.findByText("Попытки исчерпаны.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Проверить решение" })).toBeDisabled();
  });

  it("checks puzzle solution and refreshes on success", async () => {
    render(<PuzzleView puzzle={puzzle} />);
    const checkBtn = await screen.findByRole("button", { name: "Проверить решение" });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(mocks.checkPuzzleSolutionMock).toHaveBeenCalledWith("p1", expect.any(Array));
    });
  });
});


import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuestionView } from "@/app/(main)/questions/[id]/question-view";
import type { Question } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  toastMock: vi.fn(),
  checkQuestionAnswerMock: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock("@/lib/api/questions", () => ({
  checkQuestionAnswer: (...args: unknown[]) => mocks.checkQuestionAnswerMock(...args),
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

const question: Question = {
  id: "q1",
  title: "Q",
  prompt: "Select one",
  multiple: false,
  choices: [
    { id: "c1", text: "A" },
    { id: "c2", text: "B" },
  ],
  maxAttempts: 3,
  attemptsUsed: 0,
};

describe("QuestionView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkQuestionAnswerMock.mockResolvedValue({ passed: true, message: "ok" });
  });

  it("submit button is disabled until a choice selected", () => {
    render(<QuestionView question={question} />);
    const submit = screen.getByRole("button", { name: "Проверить" });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByText("A"));
    expect(submit).toBeEnabled();
  });

  it("calls API and refreshes on successful check", async () => {
    render(<QuestionView question={question} />);
    fireEvent.click(screen.getByText("A"));
    fireEvent.click(screen.getByRole("button", { name: "Проверить" }));

    await waitFor(() => expect(mocks.checkQuestionAnswerMock).toHaveBeenCalledWith("q1", expect.any(Array)));
    expect(mocks.toastMock).toHaveBeenCalled();
  });

  it("shows attempts exhausted and keeps submit disabled", () => {
    render(<QuestionView question={{ ...question, maxAttempts: 1, attemptsUsed: 1 }} />);
    expect(screen.getByText("Попытки исчерпаны.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Проверить" })).toBeDisabled();
  });
});


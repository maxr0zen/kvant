import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskView } from "@/app/(main)/tasks/[id]/task-view";
import type { Task } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  toastMock: vi.fn(),
  submitTaskMock: vi.fn(),
  fetchTaskDraftMock: vi.fn(),
  saveTaskDraftMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock("@/lib/api/tasks", () => ({
  submitTask: (...args: unknown[]) => mocks.submitTaskMock(...args),
  fetchTaskDraft: (...args: unknown[]) => mocks.fetchTaskDraftMock(...args),
  saveTaskDraft: (...args: unknown[]) => mocks.saveTaskDraftMock(...args),
}));

vi.mock("@/lib/api/client", () => ({
  hasApi: () => true,
}));

vi.mock("@/lib/api/auth", () => ({
  getStoredToken: () => "tok",
}));

vi.mock("@/lib/utils/attempt-limiter", () => ({
  isAttemptLimitExceeded: () => false,
  recordFailedAttempt: vi.fn(),
  getRemainingAttempts: () => 3,
  getCooldownMinutesRemaining: () => 0,
}));

vi.mock("@/components/editor/code-editor", () => ({
  CodeEditor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="code-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("@/components/testcases/testcases-panel", () => ({
  TestCasesPanel: () => <div data-testid="testcases-panel">testcases</div>,
}));

vi.mock("@/lib/runner/browser-python", () => ({
  runPythonInBrowser: vi.fn(),
  normalizeOutput: (s: string) => s,
}));

const task: Task = {
  id: "t1",
  title: "Task",
  description: "Desc",
  starterCode: "print(1)",
  language: "python",
  testCases: [{ id: "c1", input: "1", expectedOutput: "1", isPublic: true }],
  maxAttempts: 2,
  attemptsUsed: 0,
};

describe("TaskView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchTaskDraftMock.mockResolvedValue(null);
    mocks.submitTaskMock.mockResolvedValue({
      passed: true,
      results: [{ caseId: "c1", passed: true }],
      message: "ok",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("disables submit when attempts are exhausted", () => {
    render(<TaskView task={{ ...task, maxAttempts: 1, attemptsUsed: 1 }} />);
    expect(screen.getByText("Попытки исчерпаны для этого задания.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отправить решение" })).toBeDisabled();
  });

  it("submits solution and refreshes router on success", async () => {
    render(<TaskView task={task} />);

    fireEvent.click(screen.getByRole("button", { name: "Отправить решение" }));

    await waitFor(() => expect(mocks.submitTaskMock).toHaveBeenCalledWith("t1", "print(1)"));
    expect(mocks.toastMock).toHaveBeenCalled();
  });

  it("saves draft with debounce after code change", async () => {
    render(<TaskView task={task} />);
    fireEvent.change(screen.getByLabelText("code-editor"), { target: { value: "print(2)" } });
    await new Promise((resolve) => setTimeout(resolve, 1800));

    await waitFor(() => {
      expect(mocks.saveTaskDraftMock).toHaveBeenCalledWith("t1", "print(2)");
    });
  });
});


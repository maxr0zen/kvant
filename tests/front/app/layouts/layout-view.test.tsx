import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LayoutView } from "@/app/(main)/layouts/[id]/layout-view";
import type { Layout } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  checkLayoutMock: vi.fn(),
  fetchLayoutDraftMock: vi.fn(),
  saveLayoutDraftMock: vi.fn(),
}));

vi.mock("@/lib/api/layouts", () => ({
  checkLayout: (...args: unknown[]) => mocks.checkLayoutMock(...args),
  fetchLayoutDraft: (...args: unknown[]) => mocks.fetchLayoutDraftMock(...args),
  saveLayoutDraft: (...args: unknown[]) => mocks.saveLayoutDraftMock(...args),
}));

vi.mock("@/lib/api/client", () => ({
  hasApi: () => true,
}));

vi.mock("@/lib/api/auth", () => ({
  getStoredToken: () => "tok",
}));

vi.mock("@/components/editor/code-editor", () => ({
  CodeEditor: ({
    value,
    onChange,
    "data-testid": tid,
  }: {
    value: string;
    onChange: (v: string) => void;
    "data-testid"?: string;
  }) => (
    <textarea
      data-testid={tid ?? "code-editor"}
      aria-label="code-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/components/code-highlight", () => ({
  CodeHighlight: ({ code }: { code: string }) => <pre data-testid="code-highlight">{code}</pre>,
}));

vi.mock("@/components/hints-block", () => ({
  HintsBlock: () => <div data-testid="hints-block">hints</div>,
}));

vi.mock("@/components/availability-notice", () => ({
  AvailabilityNotice: () => null,
}));

const layoutAllEditable: Layout = {
  id: "lay1",
  title: "Box Layout",
  description: "Create a box with class .box",
  templateHtml: "<div></div>",
  templateCss: "",
  templateJs: "",
  editableFiles: ["html", "css", "js"],
  subtasks: [
    { id: "s1", title: "Box exists", checkType: "selector_exists", checkValue: ".box" },
  ],
};

const layoutHtmlOnly: Layout = {
  ...layoutAllEditable,
  editableFiles: ["html"],
};

describe("LayoutView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchLayoutDraftMock.mockResolvedValue(null);
    mocks.checkLayoutMock.mockResolvedValue({
      passed: false,
      subtasks: [{ id: "s1", title: "Box exists", passed: false, message: "" }],
    });
  });

  it("renders file switch buttons HTML, CSS, JS", () => {
    render(<LayoutView layout={layoutAllEditable} />);
    expect(screen.getByRole("button", { name: "HTML" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CSS" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "JS" })).toBeInTheDocument();
  });

  it("shows read-only for non-editable files", async () => {
    render(<LayoutView layout={layoutHtmlOnly} />);
    expect(screen.getByLabelText("code-editor")).toBeInTheDocument();
    expect(screen.queryByTestId("read-only-html")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "CSS" }));
    await waitFor(() => expect(screen.getByTestId("read-only-css")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "JS" }));
    await waitFor(() => expect(screen.getByTestId("read-only-js")).toBeInTheDocument());
  });

  it("calls checkLayout after debounce when code changes", async () => {
    render(<LayoutView layout={layoutAllEditable} />);
    await waitFor(
      () => {
        expect(mocks.checkLayoutMock).toHaveBeenCalledWith(
          "lay1",
          expect.any(String),
          expect.any(String),
          expect.any(String)
        );
      },
      { timeout: 3000 }
    );
  });

  it("shows subtask titles and status when check passes", async () => {
    mocks.checkLayoutMock.mockResolvedValue({
      passed: true,
      subtasks: [{ id: "s1", title: "Box exists", passed: true, message: "" }],
    });
    render(<LayoutView layout={layoutAllEditable} />);
    await waitFor(
      () => {
        expect(screen.getByText("Box exists")).toBeInTheDocument();
        expect(screen.getByText("Все подзадачи выполнены!")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("shows error message when layout check fails with error", async () => {
    mocks.checkLayoutMock.mockResolvedValue({
      passed: false,
      subtasks: [],
      error: "Ошибка проверки сервера",
    });

    render(<LayoutView layout={layoutAllEditable} />);

    await waitFor(
      () => {
        expect(screen.getByText("Ошибка проверки сервера")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("shows warnings when layout check returns minor issues", async () => {
    mocks.checkLayoutMock.mockResolvedValue({
      passed: false,
      subtasks: [],
      warnings: ["Тег <span> не закрыт."],
    });

    render(<LayoutView layout={layoutAllEditable} />);

    await waitFor(
      () => {
        expect(screen.getByText("Тег <span> не закрыт.")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("shows blocking syntax errors from checker", async () => {
    mocks.checkLayoutMock.mockResolvedValue({
      passed: false,
      subtasks: [],
      errors: ["HTML: тег <span> не закрыт."],
    });

    render(<LayoutView layout={layoutAllEditable} />);

    await waitFor(
      () => {
        expect(screen.getByText("Зачёт недоступен: исправьте синтаксические ошибки.")).toBeInTheDocument();
        expect(screen.getByText("HTML: тег <span> не закрыт.")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("shows abuse flags when checker reports suspicious payload", async () => {
    mocks.checkLayoutMock.mockResolvedValue({
      passed: false,
      subtasks: [],
      abuseFlags: ["selector_too_large"],
    });

    render(<LayoutView layout={layoutAllEditable} />);

    await waitFor(
      () => {
        expect(screen.getByText(/Обнаружены подозрительные паттерны/)).toBeInTheDocument();
        expect(screen.getByText(/selector_too_large/)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("shows theory block when description present", () => {
    render(<LayoutView layout={layoutAllEditable} />);
    expect(screen.getByText("Теория")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Теория"));
    expect(screen.getByText("Create a box with class .box")).toBeInTheDocument();
  });
});

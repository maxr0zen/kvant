import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LectureEditorForm } from "@/components/lecture-editor-form";

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("LectureEditorForm web_file block", () => {
  it("has a 'Веб-файл' button and adds a web_file block on click", async () => {
    render(
      <LectureEditorForm
        mode="create"
        onCreate={async () => ({ id: "new-id" })}
        onUpdate={async () => {}}
      />
    );

    const webFileBtn = screen.getByRole("button", { name: /Веб-файл/i });
    expect(webFileBtn).toBeInTheDocument();

    fireEvent.click(webFileBtn);

    // After adding, the editor input for URL should appear
    const urlInput = await screen.findByPlaceholderText("/web-lection-files/lesson/index.html");
    expect(urlInput).toBeInTheDocument();
  });
});

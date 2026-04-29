import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlockEditorWebFile } from "@/components/lecture-blocks/block-editor-web-file";

describe("BlockEditorWebFile", () => {
  it("calls onChange when URL is typed", () => {
    const onChange = vi.fn();
    const onRemove = vi.fn();
    render(
      <BlockEditorWebFile
        block={{ type: "web_file", url: "", title: "" }}
        onChange={onChange}
        onRemove={onRemove}
      />
    );

    const urlInput = screen.getByPlaceholderText("/web-lection-files/lesson/index.html");
    fireEvent.change(urlInput, { target: { value: "/web-lection-files/new.html" } });

    expect(onChange).toHaveBeenCalledWith({
      type: "web_file",
      url: "/web-lection-files/new.html",
      title: "",
    });
  });

  it("calls onChange when title is typed", () => {
    const onChange = vi.fn();
    const onRemove = vi.fn();
    render(
      <BlockEditorWebFile
        block={{ type: "web_file", url: "/web-lection-files/existing.html", title: "" }}
        onChange={onChange}
        onRemove={onRemove}
      />
    );

    const titleInput = screen.getByPlaceholderText("Заголовок (необязательно)");
    fireEvent.change(titleInput, { target: { value: "My Lecture" } });

    expect(onChange).toHaveBeenCalledWith({
      type: "web_file",
      url: "/web-lection-files/existing.html",
      title: "My Lecture",
    });
  });

  it("calls onRemove when delete button is clicked", () => {
    const onChange = vi.fn();
    const onRemove = vi.fn();
    render(
      <BlockEditorWebFile
        block={{ type: "web_file", url: "/web-lection-files/test.html", title: "Test" }}
        onChange={onChange}
        onRemove={onRemove}
      />
    );

    const removeBtn = screen.getByRole("button", { name: /Удалить блок/i });
    fireEvent.click(removeBtn);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

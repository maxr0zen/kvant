import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BlockViewWebFile } from "@/components/lecture-blocks/block-view-web-file";

describe("BlockViewWebFile", () => {
  it("renders iframe with correct src", () => {
    render(
      <BlockViewWebFile block={{ type: "web_file", url: "/web-lection-files/lesson.html", title: "Lesson" }} />
    );
    const iframe = screen.getByTitle("Lesson");
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe).toHaveAttribute("src", "/web-lection-files/lesson.html");
  });

  it("renders iframe without title when title is absent", () => {
    render(
      <BlockViewWebFile block={{ type: "web_file", url: "/web-lection-files/test.html" }} />
    );
    const iframe = screen.getByTitle("Веб-файл");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", "/web-lection-files/test.html");
  });

  it("shows fallback when url is empty", () => {
    render(<BlockViewWebFile block={{ type: "web_file", url: "" }} />);
    expect(screen.getByText(/Не указан URL веб-файла/i)).toBeInTheDocument();
    expect(screen.queryByTitle(/Веб-файл/)).not.toBeInTheDocument();
  });

  it("hides title and border in immersive mode", () => {
    render(
      <BlockViewWebFile
        block={{ type: "web_file", url: "/web-lection-files/lesson.html", title: "Lesson" }}
        immersive
      />
    );
    expect(screen.queryByText("Lesson")).not.toBeInTheDocument();
    const iframe = screen.getByTitle("Lesson");
    expect(iframe.className).not.toContain("rounded-lg");
    expect(iframe.className).not.toContain("border");
  });

  it("sets inline height after iframe loads", async () => {
    render(
      <BlockViewWebFile block={{ type: "web_file", url: "/web-lection-files/lesson.html", title: "Lesson" }} />
    );
    const iframe = screen.getByTitle("Lesson") as HTMLIFrameElement;

    // Simulate loaded iframe with scrollable content
    Object.defineProperty(iframe, "contentWindow", {
      value: {
        document: {
          body: { scrollHeight: 1234 },
          documentElement: { scrollHeight: 1200 },
        },
      },
      writable: true,
    });

    act(() => {
      iframe.dispatchEvent(new Event("load"));
    });

    // Wait for effect + timeout
    await vi.waitFor(() => {
      expect(iframe.style.height).toBe("1234px");
    });
  });
});

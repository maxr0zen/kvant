import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LectureBlocks } from "@/app/(main)/lectures/[id]/lecture-blocks";

describe("LectureBlocks with web_file", () => {
  it("renders a web_file block among other blocks", () => {
    const blocks = [
      { type: "text" as const, content: "<p>Intro</p>" },
      { type: "web_file" as const, url: "/web-lection-files/lesson.html", title: "Interactive" },
      { type: "text" as const, content: "<p>Outro</p>" },
    ];

    render(<LectureBlocks blocks={blocks} lectureId="lec1" />);

    // Text blocks render normalized HTML
    expect(screen.getByText("Intro")).toBeInTheDocument();
    expect(screen.getByText("Outro")).toBeInTheDocument();

    // Web file block renders iframe
    const iframe = screen.getByTitle("Interactive");
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe).toHaveAttribute("src", "/web-lection-files/lesson.html");
  });

  it("renders web_file block without title using default", () => {
    const blocks = [{ type: "web_file" as const, url: "/web-lection-files/test.html" }];

    render(<LectureBlocks blocks={blocks} lectureId="lec2" />);

    const iframe = screen.getByTitle("Веб-файл");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", "/web-lection-files/test.html");
  });

  it("passes immersive prop to web_file block", () => {
    const blocks = [
      { type: "web_file" as const, url: "/web-lection-files/lesson.html", title: "Interactive" },
    ];

    render(<LectureBlocks blocks={blocks} lectureId="lec3" immersive />);

    const iframe = screen.getByTitle("Interactive");
    expect(iframe).toBeInTheDocument();
    expect(screen.queryByText("Interactive")).not.toBeInTheDocument();
    expect(iframe.className).not.toContain("rounded-lg");
  });
});

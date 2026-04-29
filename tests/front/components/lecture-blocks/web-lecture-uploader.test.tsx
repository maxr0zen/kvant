import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WebLectureUploader } from "@/components/lecture-blocks/web-lecture-uploader";
import * as api from "@/lib/api/web-lectures";
import { Toaster } from "@/components/ui/toaster";

vi.mock("@/lib/api/web-lectures", () => ({
  uploadWebLecture: vi.fn(),
}));

describe("WebLectureUploader", () => {
  it("renders drop zone initially", () => {
    render(<WebLectureUploader onUploaded={vi.fn()} />);
    expect(screen.getByText(/Перетащите ZIP-архив/i)).toBeInTheDocument();
  });

  it("shows selected file after selection", () => {
    render(<WebLectureUploader onUploaded={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.zip", { type: "application/zip" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("test.zip")).toBeInTheDocument();
  });

  it("calls onUploaded after successful upload", async () => {
    const onUploaded = vi.fn();
    vi.mocked(api.uploadWebLecture).mockResolvedValue({ url: "/web-lection-files/abc/index.html", folder: "abc" });

    render(
      <>
        <WebLectureUploader onUploaded={onUploaded} />
        <Toaster />
      </>
    );

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["test"], "test.zip", { type: "application/zip" });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByText(/Загрузить/i));

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith("/web-lection-files/abc/index.html");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchLayoutById,
  checkLayout,
  fetchLayoutDraft,
  saveLayoutDraft,
  createLayout,
  updateLayout,
  deleteLayout,
} from "@/lib/api/layouts";

describe("layouts API", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    localStorage.setItem("auth_token", "tok");
  });

  it("fetchLayoutById maps layout with editable_files and subtasks", async () => {
    const mockLayout = {
      id: "lay1",
      title: "Box Layout",
      description: "Create a box",
      template_html: "<div></div>",
      template_css: "",
      template_js: "",
      editable_files: ["html", "css"],
      subtasks: [
        { id: "s1", title: "Box exists", check_type: "selector_exists", check_value: ".box" },
      ],
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLayout),
    });

    const result = await fetchLayoutById("lay1");
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Box Layout");
    expect(result!.editableFiles).toEqual(["html", "css"]);
    expect(result!.subtasks).toHaveLength(1);
    expect(result!.subtasks![0]!.checkType).toBe("selector_exists");
  });

  it("checkLayout returns passed and subtasks", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          passed: true,
          subtasks: [{ id: "s1", title: "Box", passed: true, message: "" }],
        }),
    });

    const result = await checkLayout("lay1", "<div class='box'></div>", "", "");
    expect(result.passed).toBe(true);
    expect(result.subtasks).toHaveLength(1);
    expect(result.subtasks![0]!.passed).toBe(true);
  });

  it("checkLayout returns passed:false when API fails", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
    });

    const result = await checkLayout("lay1", "", "", "");
    expect(result.passed).toBe(false);
    expect(result.subtasks).toEqual([]);
  });

  it("fetchLayoutDraft returns null without token", async () => {
    localStorage.removeItem("auth_token");
    const result = await fetchLayoutDraft("lay1");
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("saveLayoutDraft sends PUT with html/css/js", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    });

    await saveLayoutDraft("lay1", "<div>x</div>", ".x{}", "console.log(1)");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/layouts/lay1/draft/"),
      expect.objectContaining({
        method: "PUT",
        body: expect.any(String),
      })
    );
    const body = JSON.parse(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string
    );
    expect(body.html).toBe("<div>x</div>");
    expect(body.css).toBe(".x{}");
    expect(body.js).toBe("console.log(1)");
  });

  it("createLayout maps payload to snake_case", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "lay2",
          title: "New",
          template_html: "<html></html>",
          template_css: "",
          template_js: "",
          editable_files: ["html"],
          subtasks: [],
        }),
    });

    await createLayout({
      title: "New",
      templateHtml: "<html></html>",
      templateCss: "",
      templateJs: "",
      editableFiles: ["html"],
      subtasks: [{ id: "s1", title: "T", checkType: "html_contains", checkValue: "body" }],
    });

    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse(options.body as string);
    expect(body.template_html).toBe("<html></html>");
    expect(body.editable_files).toEqual(["html"]);
    expect(body.subtasks[0].check_type).toBe("html_contains");
  });

  it("updateLayout sends PATCH with partial data", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "lay1",
          title: "Updated",
          template_html: "<div></div>",
          template_css: "",
          template_js: "",
          editable_files: ["html", "css", "js"],
          subtasks: [],
        }),
    });

    await updateLayout("lay1", { title: "Updated" });

    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(options.method).toBe("PATCH");
    const body = JSON.parse(options.body as string);
    expect(body.title).toBe("Updated");
  });

  it("deleteLayout sends DELETE", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
    });

    await deleteLayout("lay1");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/layouts/lay1/"),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

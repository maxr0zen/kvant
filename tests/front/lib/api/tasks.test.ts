import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchTaskById, fetchTaskDraft, saveTaskDraft, submitTask, updateTask } from "@/lib/api/tasks";

describe("tasks API", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("mapTaskFromApi: fetchTaskById maps task with hints and max_attempts", async () => {
    const mockTask = {
      id: "task1",
      title: "Sum",
      description: "Add numbers",
      starter_code: "print(1+1)",
      track_id: "tr1",
      test_cases: [
        { id: "c1", input: "1", expected_output: "2", is_public: true },
      ],
      hard: false,
      hints: ["Hint 1"],
      max_attempts: 5,
      attempts_used: 2,
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTask),
    });

    const result = await fetchTaskById("task1");
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Sum");
    expect(result!.hints).toEqual(["Hint 1"]);
    expect(result!.maxAttempts).toBe(5);
    expect(result!.attemptsUsed).toBe(2);
    expect(result!.testCases).toHaveLength(1);
    expect(result!.testCases![0]!.expectedOutput).toBe("2");
  });

  it("updateTask maps payload to snake_case fields", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "task1",
          title: "Updated",
          description: "",
          starter_code: "print(1)",
          test_cases: [{ id: "c1", input: "1", expected_output: "1", is_public: true }],
        }),
    });

    await updateTask("task1", {
      title: "Updated",
      starterCode: "print(1)",
      maxAttempts: 3,
      testCases: [{ id: "c1", input: "1", expectedOutput: "1", isPublic: true }],
    });

    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse(options.body as string);
    expect(body.starter_code).toBe("print(1)");
    expect(body.max_attempts).toBe(3);
    expect(body.test_cases[0].expected_output).toBe("1");
  });

  it("fetchTaskDraft returns null without stored token", async () => {
    localStorage.removeItem("auth_token");
    const result = await fetchTaskDraft("task1");
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("saveTaskDraft sends keepalive flag when requested", async () => {
    localStorage.setItem("auth_token", "tok");
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    });

    await saveTaskDraft("task1", "code", true);

    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(options.keepalive).toBe(true);
  });

  it("submitTask throws backend detail for non-ok response", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: "Ошибка лимита" }),
    });

    await expect(submitTask("task1", "print(0)")).rejects.toThrow("Ошибка лимита");
  });
});

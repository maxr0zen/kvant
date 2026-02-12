import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchTaskById } from "@/lib/api/tasks";

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
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchTracks, fetchTrackById, type TracksWithOrphans } from "@/lib/api/tracks";

describe("tracks API", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("mapTrackFromApi: fetchTracks maps tracks and orphan_* from response", async () => {
    const mockData = {
      tracks: [
        {
          id: "tr1",
          title: "Track One",
          description: "Desc",
          lessons: [{ id: "l1", type: "lecture", title: "L1", order: 0 }],
          order: 0,
          visible_group_ids: [],
        },
      ],
      orphan_lectures: [{ id: "o1", title: "Orphan L" }],
      orphan_tasks: [{ id: "o2", title: "Orphan T", hard: true }],
      orphan_puzzles: [{ id: "o3", title: "Orphan P" }],
      orphan_questions: [{ id: "o4", title: "Orphan Q" }],
    };

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchTracks();
    expect(result).toBeDefined();
    const data = result as TracksWithOrphans;
    expect(data.tracks).toHaveLength(1);
    expect(data.tracks[0]!.title).toBe("Track One");
    expect(data.tracks[0]!.id).toBe("tr1");
    expect(data.orphan_lectures).toHaveLength(1);
    expect(data.orphan_lectures[0]!.id).toBe("o1");
    expect(data.orphan_tasks).toHaveLength(1);
    expect(data.orphan_tasks[0]!.hard).toBe(true);
    expect(data.orphan_puzzles).toHaveLength(1);
    expect(data.orphan_questions).toHaveLength(1);
  });

  it("fetchTrackById maps track from response", async () => {
    const mockTrack = {
      id: "tr2",
      title: "Single",
      description: "",
      lessons: [],
      order: 0,
    };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTrack),
    });

    const result = await fetchTrackById("tr2");
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Single");
    expect(result!.id).toBe("tr2");
  });
});

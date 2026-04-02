import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TrackEditLessons } from "@/components/track-edit-lessons";
import type { Track } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  fetchTracksMock: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  getStoredRole: () => "teacher",
}));

vi.mock("@/lib/api/tracks", () => ({
  fetchTracks: () => mocks.fetchTracksMock(),
  updateTrack: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/main/track",
  useSearchParams: () => ({ get: () => null }),
}));

describe("TrackEditLessons", () => {
  it("shows lessons from other tracks for teacher", async () => {
    const track: Track = {
      id: "t-current",
      title: "Current",
      description: "",
      order: 1,
      lessons: [],
    };
    mocks.fetchTracksMock.mockResolvedValue({
      tracks: [
        { ...track, lessons: [] },
        {
          id: "t-foreign",
          title: "Foreign",
          description: "",
          order: 2,
          lessons: [{ id: "l-1", type: "lecture", title: "Foreign lecture", order: 0 }],
        },
      ],
      orphan_lectures: [],
      orphan_tasks: [],
      orphan_puzzles: [],
      orphan_questions: [],
      orphan_surveys: [],
      orphan_layouts: [],
      orphan_overdue_lectures: [],
      orphan_overdue_tasks: [],
      orphan_overdue_puzzles: [],
      orphan_overdue_questions: [],
      orphan_overdue_surveys: [],
      orphan_overdue_layouts: [],
    });

    render(<TrackEditLessons track={track} trackId={track.id} />);
    fireEvent.click(screen.getByRole("button", { name: "Редактировать состав трека" }));
    await waitFor(() => {
      expect(screen.getByText("Из треков: Лекция")).toBeInTheDocument();
      expect(screen.getByText("Foreign lecture")).toBeInTheDocument();
    });
  });
});

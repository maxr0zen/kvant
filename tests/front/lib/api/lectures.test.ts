import { describe, it, expect } from "vitest";
import { mapLectureFromApi } from "@/lib/api/lectures";

describe("mapLectureFromApi", () => {
  it("preserves web_file blocks correctly", () => {
    const apiData = {
      id: "lec1",
      title: "Web File Lecture",
      blocks: [
        { type: "web_file", url: "/web-lection-files/test.html", title: "Test" },
      ],
      visible_group_ids: [],
      can_edit: false,
    };

    const lecture = mapLectureFromApi(apiData);

    expect(lecture.id).toBe("lec1");
    expect(lecture.title).toBe("Web File Lecture");
    expect(lecture.blocks).toHaveLength(1);
    expect(lecture.blocks?.[0]).toMatchObject({
      type: "web_file",
      url: "/web-lection-files/test.html",
      title: "Test",
    });
  });

  it("handles lecture without blocks", () => {
    const apiData = {
      id: "lec2",
      title: "Empty Lecture",
      blocks: undefined,
      visible_group_ids: [],
      can_edit: false,
    };

    const lecture = mapLectureFromApi(apiData);

    expect(lecture.blocks).toBeUndefined();
  });
});

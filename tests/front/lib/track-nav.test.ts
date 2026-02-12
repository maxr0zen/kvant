import { describe, it, expect } from "vitest";
import { getPrevNextLesson, getLessonHref } from "@/lib/utils/track-nav";
import type { Track, LessonRef } from "@/lib/types";

const lesson1: LessonRef = { id: "l1", type: "lecture", title: "L1", order: 0 };
const lesson2: LessonRef = { id: "l2", type: "task", title: "L2", order: 1 };
const lesson3: LessonRef = { id: "l3", type: "task", title: "L3", order: 2 };

const track: Track = {
  id: "t1",
  title: "Track",
  description: "",
  lessons: [lesson1, lesson2, lesson3],
  order: 0,
};

describe("getPrevNextLesson", () => {
  it("returns prev and next for middle lesson", () => {
    const { prev, next } = getPrevNextLesson(track, "l2");
    expect(prev).toEqual(lesson1);
    expect(next).toEqual(lesson3);
  });

  it("returns null prev for first lesson", () => {
    const { prev, next } = getPrevNextLesson(track, "l1");
    expect(prev).toBeNull();
    expect(next).toEqual(lesson2);
  });

  it("returns null next for last lesson", () => {
    const { prev, next } = getPrevNextLesson(track, "l3");
    expect(prev).toEqual(lesson2);
    expect(next).toBeNull();
  });

  it("returns both null when lesson id not in track", () => {
    const { prev, next } = getPrevNextLesson(track, "nonexistent");
    expect(prev).toBeNull();
    expect(next).toBeNull();
  });
});

describe("getLessonHref", () => {
  it("returns href for track and lesson", () => {
    expect(getLessonHref(lesson1, "t1")).toBe("/tracks/t1/lesson/l1");
    expect(getLessonHref(lesson2, "track-id")).toBe("/tracks/track-id/lesson/l2");
  });
});

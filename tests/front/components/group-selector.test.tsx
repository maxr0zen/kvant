import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GroupSelector } from "@/components/group-selector";

const mocks = vi.hoisted(() => ({
  fetchGroupsMock: vi.fn(),
}));

vi.mock("@/lib/api/groups", () => ({
  fetchGroups: () => mocks.fetchGroupsMock(),
}));

describe("GroupSelector", () => {
  it("shows warning about original material visibility updates", async () => {
    mocks.fetchGroupsMock.mockResolvedValue([{ id: "g1", title: "Group 1" }]);
    render(<GroupSelector value={[]} onChange={() => {}} />);
    expect(
      await screen.findByText("Изменение видимости применяется к оригинальному материалу и влияет на всех преподавателей.")
    ).toBeInTheDocument();
  });
});

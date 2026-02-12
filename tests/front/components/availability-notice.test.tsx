import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvailabilityNotice } from "@/components/availability-notice";

describe("AvailabilityNotice", () => {
  it("returns null when no dates", () => {
    const { container } = render(<AvailabilityNotice />);
    expect(container.firstChild).toBeNull();
  });

  it("shows future availableFrom message", () => {
    const future = new Date(Date.now() + 86400000 * 2).toISOString();
    render(<AvailabilityNotice availableFrom={future} />);
    expect(screen.getByText(/Доступно с/)).toBeInTheDocument();
  });

  it("shows past availableUntil message", () => {
    const past = new Date(Date.now() - 86400000 * 2).toISOString();
    render(<AvailabilityNotice availableUntil={past} />);
    expect(screen.getByText(/было доступно до/)).toBeInTheDocument();
  });
});

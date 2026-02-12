import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HintsBlock } from "@/components/hints-block";

describe("HintsBlock", () => {
  it("returns null when hints is empty", () => {
    const { container } = render(<HintsBlock hints={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when hints is undefined", () => {
    const { container } = render(<HintsBlock hints={undefined as unknown as string[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title and shows first hint after click", () => {
    render(<HintsBlock hints={["First hint", "Second hint"]} />);
    expect(screen.getByText("Подсказки")).toBeInTheDocument();
    expect(screen.queryByText("First hint")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: /Показать подсказку 1/i });
    fireEvent.click(button);
    expect(screen.getByText("First hint")).toBeInTheDocument();
  });
});

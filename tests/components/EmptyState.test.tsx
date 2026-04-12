/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EmptyState from "@/components/shared/EmptyState";
import { Search } from "lucide-react";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState icon={Search} title="No results found" />);
    expect(screen.getByText("No results found")).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(
      <EmptyState
        icon={Search}
        title="No results"
        description="Try adjusting your filters"
      />
    );
    expect(screen.getByText("Try adjusting your filters")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    const { container } = render(<EmptyState icon={Search} title="Empty" />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(0);
  });

  it("renders action when provided", () => {
    render(
      <EmptyState
        icon={Search}
        title="Empty"
        action={<button>Click me</button>}
      />
    );
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("renders the icon container", () => {
    const { container } = render(<EmptyState icon={Search} title="Test" />);
    const iconWrapper = container.querySelector(".w-16.h-16");
    expect(iconWrapper).toBeInTheDocument();
  });
});

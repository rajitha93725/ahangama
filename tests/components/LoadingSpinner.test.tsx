/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders a spinner element", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("applies sm size class", () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner?.className).toContain("w-4");
    expect(spinner?.className).toContain("h-4");
  });

  it("applies md size class by default", () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner?.className).toContain("w-8");
    expect(spinner?.className).toContain("h-8");
  });

  it("applies lg size class", () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner?.className).toContain("w-12");
    expect(spinner?.className).toContain("h-12");
  });

  it("accepts custom className", () => {
    const { container } = render(<LoadingSpinner className="my-custom-class" />);
    expect(container.firstChild).toHaveClass("my-custom-class");
  });
});

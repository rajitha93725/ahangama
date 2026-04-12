/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import StarRating from "@/components/shared/StarRating";

describe("StarRating", () => {
  it("renders the correct number of stars", () => {
    const { container } = render(<StarRating value={3} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(5); // default max=5
  });

  it("renders custom max stars", () => {
    const { container } = render(<StarRating value={2} max={10} />);
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(10);
  });

  it("fills correct number of stars", () => {
    const { container } = render(<StarRating value={3} />);
    const stars = container.querySelectorAll("svg");
    const filled = Array.from(stars).filter((s) => s.classList.contains("fill-amber-400"));
    expect(filled).toHaveLength(3);
  });

  it("calls onChange when clicking a star", () => {
    const handleChange = jest.fn();
    const { container } = render(<StarRating value={2} onChange={handleChange} />);
    const buttons = container.querySelectorAll("button");
    fireEvent.click(buttons[3]); // click 4th star
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it("disables buttons in readonly mode", () => {
    const { container } = render(<StarRating value={3} readonly />);
    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("applies sm size class", () => {
    const { container } = render(<StarRating value={1} size="sm" />);
    const stars = container.querySelectorAll("svg");
    expect(stars[0].classList.contains("w-3")).toBe(true);
  });

  it("applies lg size class", () => {
    const { container } = render(<StarRating value={1} size="lg" />);
    const stars = container.querySelectorAll("svg");
    expect(stars[0].classList.contains("w-6")).toBe(true);
  });
});

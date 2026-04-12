/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import PropertyFilters from "@/components/property/PropertyFilters";

const defaultProps = {
  districts: ["Colombo", "Galle", "Kandy"],
  currentFilters: {},
};

describe("PropertyFilters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders filter heading", () => {
    render(<PropertyFilters {...defaultProps} />);
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("renders district options", () => {
    render(<PropertyFilters {...defaultProps} />);
    expect(screen.getByText("All locations")).toBeInTheDocument();
    expect(screen.getByText("Colombo")).toBeInTheDocument();
    expect(screen.getByText("Galle")).toBeInTheDocument();
  });

  it("renders price range inputs", () => {
    render(<PropertyFilters {...defaultProps} />);
    expect(screen.getByPlaceholderText("Min")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Max")).toBeInTheDocument();
  });

  it("does not show reset when no filters active", () => {
    render(<PropertyFilters {...defaultProps} />);
    expect(screen.queryByText("Reset")).not.toBeInTheDocument();
  });

  it("shows reset when filters are active", () => {
    render(
      <PropertyFilters
        districts={["Galle"]}
        currentFilters={{ district: "Galle" }}
      />
    );
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("navigates on apply with filters", () => {
    render(
      <PropertyFilters
        districts={["Galle"]}
        currentFilters={{ district: "Galle" }}
      />
    );
    const applyButton = screen.getByText("Search");
    fireEvent.click(applyButton);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("district=Galle"));
  });
});

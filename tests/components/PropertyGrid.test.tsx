/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import PropertyGrid from "@/components/property/PropertyGrid";

const mockProperties = [
  {
    id: "p1",
    title: "Villa 1",
    district: "Galle",
    propertyType: "VILLA",
    pricePerNight: 100,
    maxGuests: 4,
    bedrooms: 2,
    avgRating: 4.0,
    reviewCount: 5,
    images: [{ url: "/img1.jpg" }],
    host: { name: "Host 1" },
  },
  {
    id: "p2",
    title: "Hotel 2",
    district: "Colombo",
    propertyType: "HOTEL",
    pricePerNight: 200,
    maxGuests: 2,
    bedrooms: 1,
    avgRating: null,
    reviewCount: 0,
    images: [],
    host: { name: "Host 2" },
  },
];

describe("PropertyGrid", () => {
  it("renders a grid of property cards", () => {
    render(<PropertyGrid properties={mockProperties} />);
    expect(screen.getByText("Villa 1")).toBeInTheDocument();
    expect(screen.getByText("Hotel 2")).toBeInTheDocument();
  });

  it("renders empty state when no properties", () => {
    render(<PropertyGrid properties={[]} />);
    expect(screen.getByText(/no properties/i)).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import PropertyCard from "@/components/property/PropertyCard";

const defaultProps = {
  id: "prop-1",
  title: "Oceanview Villa",
  district: "Galle",
  propertyType: "VILLA",
  pricePerNight: 150,
  maxGuests: 6,
  bedrooms: 3,
  avgRating: 4.5,
  reviewCount: 12,
  images: [{ url: "/uploads/villa.jpg", alt: "Villa photo" }],
  host: { name: "John Host", image: "/uploads/avatar.jpg" },
};

describe("PropertyCard", () => {
  it("renders the property title", () => {
    render(<PropertyCard {...defaultProps} />);
    expect(screen.getByText("Oceanview Villa")).toBeInTheDocument();
  });

  it("renders the district", () => {
    render(<PropertyCard {...defaultProps} />);
    expect(screen.getByText(/Galle/)).toBeInTheDocument();
  });

  it("renders formatted price", () => {
    render(<PropertyCard {...defaultProps} />);
    expect(screen.getByText(/\$150/)).toBeInTheDocument();
  });

  it("renders the property type badge", () => {
    render(<PropertyCard {...defaultProps} />);
    expect(screen.getByText("VILLA")).toBeInTheDocument();
  });

  it("links to the property detail page", () => {
    render(<PropertyCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/properties/prop-1");
  });

  it("renders image with correct src", () => {
    render(<PropertyCard {...defaultProps} />);
    const img = screen.getByAltText("Oceanview Villa");
    expect(img).toHaveAttribute("src", "/uploads/villa.jpg");
  });

  it("uses placeholder for no images", () => {
    render(<PropertyCard {...defaultProps} images={[]} />);
    const img = screen.getByAltText("Oceanview Villa");
    expect(img).toHaveAttribute("src", "/images/placeholder.jpg");
  });
});

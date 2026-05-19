/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock("lucide-react", () => ({
  ChevronLeft: () => <span data-testid="chevron-left" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
  X: () => <span data-testid="x-icon" />,
}));

import PropertyGallery from "@/components/property/PropertyGallery";

describe("PropertyGallery", () => {
  const images = [
    { id: "i1", url: "/uploads/img1.jpg", alt: "Image 1", isPrimary: true, order: 0 },
    { id: "i2", url: "/uploads/img2.jpg", alt: "Image 2", isPrimary: false, order: 1 },
    { id: "i3", url: "/uploads/img3.jpg", alt: "Image 3", isPrimary: false, order: 2 },
  ];

  it("renders all images", () => {
    render(<PropertyGallery images={images} title="Test Property" />);
    const imgElements = screen.getAllByRole("img");
    expect(imgElements.length).toBeGreaterThanOrEqual(3);
  });

  it("renders placeholder text when no images", () => {
    render(<PropertyGallery images={[]} title="Test Property" />);
    expect(screen.getByText(/no images available/i)).toBeInTheDocument();
  });
});

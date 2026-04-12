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

import Footer from "@/components/layout/Footer";

describe("Footer", () => {
  it("renders the brand name", () => {
    render(<Footer />);
    expect(screen.getByText("Ahangama")).toBeInTheDocument();
  });

  it("renders explore section with district links", () => {
    render(<Footer />);
    expect(screen.getByText("Galle")).toBeInTheDocument();
    expect(screen.getByText("Ella")).toBeInTheDocument();
    expect(screen.getByText("Colombo")).toBeInTheDocument();
    expect(screen.getByText("Kandy")).toBeInTheDocument();
    expect(screen.getByText("Mirissa")).toBeInTheDocument();
  });

  it("renders hosting section", () => {
    render(<Footer />);
    expect(screen.getByText("Become a Host")).toBeInTheDocument();
    expect(screen.getByText("List Your Property")).toBeInTheDocument();
    expect(screen.getByText("Host Dashboard")).toBeInTheDocument();
  });

  it("renders the copyright year", () => {
    render(<Footer />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it("renders support links", () => {
    render(<Footer />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Register")).toBeInTheDocument();
  });
});

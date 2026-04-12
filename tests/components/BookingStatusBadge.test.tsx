/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BookingStatusBadge from "@/components/booking/BookingStatusBadge";

describe("BookingStatusBadge", () => {
  it("renders the label for ACCEPTED status", () => {
    render(<BookingStatusBadge status="ACCEPTED" />);
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("renders the label for PENDING_OFFER status", () => {
    render(<BookingStatusBadge status="PENDING_OFFER" />);
    expect(screen.getByText("Awaiting Response")).toBeInTheDocument();
  });

  it("renders the label for CANCELLED status", () => {
    render(<BookingStatusBadge status="CANCELLED" />);
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("renders the label for COUNTERED status", () => {
    render(<BookingStatusBadge status="COUNTERED" />);
    expect(screen.getByText("Counter Offer Received")).toBeInTheDocument();
  });

  it("renders the label for REJECTED status", () => {
    render(<BookingStatusBadge status="REJECTED" />);
    expect(screen.getByText("Declined")).toBeInTheDocument();
  });

  it("renders the label for COMPLETED status", () => {
    render(<BookingStatusBadge status="COMPLETED" />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("falls back to raw status for unknown values", () => {
    render(<BookingStatusBadge status="UNKNOWN_STATUS" />);
    expect(screen.getByText("UNKNOWN_STATUS")).toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";

const mockConnect = jest.fn();
const mockEmit = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();

const mockSocket = {
  connected: false,
  connect: mockConnect,
  emit: mockEmit,
  on: mockOn,
  off: mockOff,
};

jest.mock("@/lib/socket", () => ({
  getSocket: () => mockSocket,
}));

import { useSocket, useBookingSocket } from "@/hooks/useSocket";

describe("useSocket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = false;
  });

  it("does nothing when userId is undefined", () => {
    renderHook(() => useSocket(undefined));
    expect(mockConnect).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it("connects and joins when userId is provided", () => {
    renderHook(() => useSocket("user-1"));
    expect(mockConnect).toHaveBeenCalled();
    expect(mockEmit).toHaveBeenCalledWith("user:join", "user-1");
  });

  it("does not reconnect if already connected", () => {
    mockSocket.connected = true;
    renderHook(() => useSocket("user-1"));
    expect(mockConnect).not.toHaveBeenCalled();
    expect(mockEmit).toHaveBeenCalledWith("user:join", "user-1");
  });
});

describe("useBookingSocket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = false;
  });

  it("does nothing when bookingId is undefined", () => {
    renderHook(() => useBookingSocket(undefined, {}));
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("connects and joins booking room", () => {
    renderHook(() => useBookingSocket("booking-1", {}));
    expect(mockConnect).toHaveBeenCalled();
    expect(mockEmit).toHaveBeenCalledWith("booking:join", "booking-1");
  });
});

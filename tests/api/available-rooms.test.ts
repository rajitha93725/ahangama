import { NextRequest } from "next/server";

// ---- Mock Prisma ----
const mockPrisma = {
  $queryRawUnsafe: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { GET } from "@/app/api/properties/[id]/available-rooms/route";

const makeParams = (id: string) =>
  Promise.resolve({ id }) as Promise<{ id: string }>;

describe("GET /api/properties/[id]/available-rooms", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 when checkIn is missing", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/properties/prop-1/available-rooms?checkOut=2026-06-05T00:00:00.000Z"
    );
    const res = await GET(req, { params: makeParams("prop-1") });
    expect(res.status).toBe(400);
  });

  it("returns 400 when checkOut is missing", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/properties/prop-1/available-rooms?checkIn=2026-06-01T00:00:00.000Z"
    );
    const res = await GET(req, { params: makeParams("prop-1") });
    expect(res.status).toBe(400);
  });

  it("returns 400 when checkOut is before checkIn", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/properties/prop-1/available-rooms?checkIn=2026-06-05T00:00:00.000Z&checkOut=2026-06-01T00:00:00.000Z"
    );
    const res = await GET(req, { params: makeParams("prop-1") });
    expect(res.status).toBe(400);
  });

  it("returns availableCount 0 when property has no rooms", async () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]); // no rooms

    const req = new NextRequest(
      "http://localhost:3000/api/properties/prop-1/available-rooms?checkIn=2026-06-01T00:00:00.000Z&checkOut=2026-06-05T00:00:00.000Z"
    );
    const res = await GET(req, { params: makeParams("prop-1") });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.availableCount).toBe(0);
  });

  it("returns availableCount equal to rooms when all are free", async () => {
    // 1. rooms list
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      { id: "room-1", name: "Room 1" },
      { id: "room-2", name: "Room 2" },
    ]);
    // room-1: no ext conflict, no int conflict
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
    // room-2: no ext conflict, no int conflict
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

    const req = new NextRequest(
      "http://localhost:3000/api/properties/prop-1/available-rooms?checkIn=2026-06-01T00:00:00.000Z&checkOut=2026-06-05T00:00:00.000Z"
    );
    const res = await GET(req, { params: makeParams("prop-1") });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.availableCount).toBe(2);
    expect(body.totalRooms).toBe(2);
  });

  it("subtracts rooms with external booking conflicts", async () => {
    // 1. rooms list
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      { id: "room-1", name: "Room 1" },
      { id: "room-2", name: "Room 2" },
    ]);
    // room-1: has ext conflict → skip
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: "ext-booking-1" }]);
    // room-2: no ext conflict, no int conflict → free
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

    const req = new NextRequest(
      "http://localhost:3000/api/properties/prop-1/available-rooms?checkIn=2026-06-01T00:00:00.000Z&checkOut=2026-06-05T00:00:00.000Z"
    );
    const res = await GET(req, { params: makeParams("prop-1") });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.availableCount).toBe(1);
  });

  it("subtracts rooms with internal booking conflicts", async () => {
    // 1. rooms list
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      { id: "room-1", name: "Room 1" },
    ]);
    // room-1: no ext conflict, but has int conflict → skip
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: "booking-1" }]);

    const req = new NextRequest(
      "http://localhost:3000/api/properties/prop-1/available-rooms?checkIn=2026-06-01T00:00:00.000Z&checkOut=2026-06-05T00:00:00.000Z"
    );
    const res = await GET(req, { params: makeParams("prop-1") });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.availableCount).toBe(0);
  });

  it("returns availableCount 0 when all rooms are booked", async () => {
    // 1. rooms list
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      { id: "room-1", name: "Room 1" },
      { id: "room-2", name: "Room 2" },
      { id: "room-3", name: "Room 3" },
    ]);
    // Each room has an internal conflict
    for (let i = 0; i < 3; i++) {
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]); // no ext
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: `booking-${i}` }]); // int conflict
    }

    const req = new NextRequest(
      "http://localhost:3000/api/properties/prop-1/available-rooms?checkIn=2026-06-01T00:00:00.000Z&checkOut=2026-06-05T00:00:00.000Z"
    );
    const res = await GET(req, { params: makeParams("prop-1") });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.availableCount).toBe(0);
  });
});

import { NextRequest } from "next/server";

// ---- Mock Prisma ----
const mockPrisma = {
  $queryRawUnsafe: jest.fn(),
  $executeRaw: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

import { POST } from "@/app/api/host/external-bookings/route";
import { PUT, DELETE } from "@/app/api/host/external-bookings/[id]/route";
import { auth } from "@/lib/auth";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const makeParams = (id: string) => Promise.resolve({ id }) as Promise<{ id: string }>;

const VALID_BODY = {
  roomId: "room-1",
  checkIn: "2026-06-01",
  checkOut: "2026-06-05",
  source: "AIRBNB",
  guestName: "John Smith",
};

// ── POST /api/host/external-bookings ──────────────────────────────────────

describe("POST /api/host/external-bookings", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    (mockAuth as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/host/external-bookings", {
      method: "POST",
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    const req = new NextRequest("http://localhost:3000/api/host/external-bookings", {
      method: "POST",
      body: JSON.stringify({ roomId: "room-1" }), // missing checkIn, checkOut, source
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid source", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    const req = new NextRequest("http://localhost:3000/api/host/external-bookings", {
      method: "POST",
      body: JSON.stringify({ ...VALID_BODY, source: "TRIPADVISOR" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when checkOut is before checkIn", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    const req = new NextRequest("http://localhost:3000/api/host/external-bookings", {
      method: "POST",
      body: JSON.stringify({ ...VALID_BODY, checkIn: "2026-06-10", checkOut: "2026-06-01" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when room not owned by host", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]); // ownership check fails

    const req = new NextRequest("http://localhost:3000/api/host/external-bookings", {
      method: "POST",
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 409 when room has an existing external booking for the period", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: "room-1", propertyId: "prop-1" }]) // ownership ok
      .mockResolvedValueOnce([{ id: "ext-conflict" }]);                 // ext conflict

    const req = new NextRequest("http://localhost:3000/api/host/external-bookings", {
      method: "POST",
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("returns 409 when room has an existing internal booking for the period", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: "room-1", propertyId: "prop-1" }]) // ownership ok
      .mockResolvedValueOnce([])                                        // no ext conflict
      .mockResolvedValueOnce([{ id: "int-conflict" }]);                 // int conflict

    const req = new NextRequest("http://localhost:3000/api/host/external-bookings", {
      method: "POST",
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("creates external booking and returns 201", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: "room-1", propertyId: "prop-1" }]) // ownership
      .mockResolvedValueOnce([])                                        // no ext conflict
      .mockResolvedValueOnce([])                                        // no int conflict
      .mockResolvedValueOnce([{                                         // SELECT new booking
        id: "ext-new",
        propertyId: "prop-1",
        roomId: "room-1",
        checkIn: "2026-06-01T00:00:00.000Z",
        checkOut: "2026-06-05T00:00:00.000Z",
        source: "AIRBNB",
        guestName: "John Smith",
        notes: null,
        status: "BOOKED",
        createdAt: new Date().toISOString(),
      }]);
    mockPrisma.$executeRaw.mockResolvedValue(1);

    const req = new NextRequest("http://localhost:3000/api/host/external-bookings", {
      method: "POST",
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.source).toBe("AIRBNB");
    expect(data.roomId).toBe("room-1");
  });

  it("accepts all valid sources", async () => {
    const validSources = ["BOOKING_COM", "AIRBNB", "AGODA", "WALK_ON", "OTHER"];
    for (const source of validSources) {
      (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([{ id: "room-1", propertyId: "prop-1" }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "new", source, roomId: "room-1", status: "BOOKED" }]);
      mockPrisma.$executeRaw.mockResolvedValue(1);

      const req = new NextRequest("http://localhost:3000/api/host/external-bookings", {
        method: "POST",
        body: JSON.stringify({ ...VALID_BODY, source }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    }
  });
});

// ── PUT /api/host/external-bookings/[id] ──────────────────────────────────

describe("PUT /api/host/external-bookings/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    (mockAuth as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/host/external-bookings/eb-1", {
      method: "PUT",
      body: JSON.stringify({ guestName: "New Name" }),
    });
    const res = await PUT(req, { params: makeParams("eb-1") });
    expect(res.status).toBe(401);
  });

  it("returns 404 when booking not found or not owned", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/host/external-bookings/eb-1", {
      method: "PUT",
      body: JSON.stringify({ guestName: "New Name" }),
    });
    const res = await PUT(req, { params: makeParams("eb-1") });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid source on update", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{
      id: "eb-1", roomId: "room-1",
      checkIn: "2026-06-01T00:00:00.000Z",
      checkOut: "2026-06-05T00:00:00.000Z",
    }]);

    const req = new NextRequest("http://localhost:3000/api/host/external-bookings/eb-1", {
      method: "PUT",
      body: JSON.stringify({ source: "INVALID" }),
    });
    const res = await PUT(req, { params: makeParams("eb-1") });
    expect(res.status).toBe(400);
  });

  it("updates booking successfully", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    const existing = {
      id: "eb-1", roomId: "room-1",
      checkIn: "2026-06-01T00:00:00.000Z",
      checkOut: "2026-06-05T00:00:00.000Z",
    };
    mockPrisma.$queryRawUnsafe
      .mockResolvedValueOnce([existing])   // ownership
      .mockResolvedValueOnce([])           // UPDATE
      .mockResolvedValueOnce([{ ...existing, guestName: "Updated Name", source: "AIRBNB", notes: null, status: "BOOKED" }]);

    const req = new NextRequest("http://localhost:3000/api/host/external-bookings/eb-1", {
      method: "PUT",
      body: JSON.stringify({ guestName: "Updated Name" }),
    });
    const res = await PUT(req, { params: makeParams("eb-1") });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.guestName).toBe("Updated Name");
  });
});

// ── DELETE /api/host/external-bookings/[id] ───────────────────────────────

describe("DELETE /api/host/external-bookings/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    (mockAuth as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/host/external-bookings/eb-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: makeParams("eb-1") });
    expect(res.status).toBe(401);
  });

  it("returns 404 when booking not found or not owned", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/host/external-bookings/eb-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: makeParams("eb-1") });
    expect(res.status).toBe(404);
  });

  it("deletes the booking and returns success", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([{ id: "eb-1" }]);
    mockPrisma.$executeRaw.mockResolvedValue(1);

    const req = new NextRequest("http://localhost:3000/api/host/external-bookings/eb-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: makeParams("eb-1") });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

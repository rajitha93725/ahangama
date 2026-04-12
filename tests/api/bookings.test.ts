import { NextRequest } from "next/server";

// ---- Mock Prisma ----
const mockPrisma = {
  booking: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  property: {
    findUnique: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

import { GET, POST } from "@/app/api/bookings/route";
import { auth } from "@/lib/auth";

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe("GET /api/bookings", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    (mockAuth as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/bookings");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns guest bookings for GUEST role", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({
      user: { id: "guest-1", role: "GUEST", name: "Guest" },
    });
    mockPrisma.booking.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/bookings");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("returns host bookings when role=host param is passed", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({
      user: { id: "host-1", role: "HOST", name: "Host" },
    });
    mockPrisma.booking.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/bookings?role=host");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { property: { hostId: "host-1" } },
      })
    );
  });
});

describe("POST /api/bookings", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    (mockAuth as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/bookings", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({
      user: { id: "guest-1", role: "GUEST", name: "Guest" },
    });

    const req = new NextRequest("http://localhost:3000/api/bookings", {
      method: "POST",
      body: JSON.stringify({ bad: "data" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid dates (checkout before checkin)", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({
      user: { id: "guest-1", role: "GUEST", name: "Guest" },
    });

    const req = new NextRequest("http://localhost:3000/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId: "prop-1",
        checkIn: "2026-06-05T00:00:00.000Z",
        checkOut: "2026-06-01T00:00:00.000Z",
        guests: 2,
        offerAmount: 100,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if property is not active", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({
      user: { id: "guest-1", role: "GUEST", name: "Guest" },
    });
    mockPrisma.property.findUnique.mockResolvedValue({
      id: "prop-1",
      hostId: "host-1",
      status: "INACTIVE",
    });

    const req = new NextRequest("http://localhost:3000/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId: "prop-1",
        checkIn: "2026-06-01T00:00:00.000Z",
        checkOut: "2026-06-05T00:00:00.000Z",
        guests: 2,
        offerAmount: 100,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if booking own property", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({
      user: { id: "host-1", role: "HOST", name: "Host" },
    });
    mockPrisma.property.findUnique.mockResolvedValue({
      id: "prop-1",
      hostId: "host-1",
      status: "ACTIVE",
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ category: "STAY", pricePerKm: null }]);

    const req = new NextRequest("http://localhost:3000/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId: "prop-1",
        checkIn: "2026-06-01T00:00:00.000Z",
        checkOut: "2026-06-05T00:00:00.000Z",
        guests: 2,
        offerAmount: 100,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Cannot book your own property");
  });

  it("creates a booking successfully", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({
      user: { id: "guest-1", role: "GUEST", name: "Guest User" },
    });
    mockPrisma.property.findUnique.mockResolvedValue({
      id: "prop-1",
      hostId: "host-1",
      status: "ACTIVE",
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ category: "STAY", pricePerKm: null }]);
    mockPrisma.booking.create.mockResolvedValue({
      id: "booking-1",
      propertyId: "prop-1",
      guestId: "guest-1",
      status: "PENDING_OFFER",
      offers: [{ id: "offer-1" }],
      property: { title: "Test Property", hostId: "host-1" },
    });
    mockPrisma.notification.create.mockResolvedValue({});

    const req = new NextRequest("http://localhost:3000/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        propertyId: "prop-1",
        checkIn: "2026-06-01T00:00:00.000Z",
        checkOut: "2026-06-05T00:00:00.000Z",
        guests: 2,
        offerAmount: 100,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

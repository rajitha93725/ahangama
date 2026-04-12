import { NextRequest } from "next/server";

// ---- Mock Prisma ----
const mockPrisma = {
  booking: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

import { GET, PATCH } from "@/app/api/bookings/[id]/route";
import { auth } from "@/lib/auth";

const mockAuth = auth as jest.Mock;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/bookings/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/bookings/b1");
    const res = await GET(req, makeParams("b1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 if booking not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "GUEST" } });
    mockPrisma.booking.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/bookings/b1");
    const res = await GET(req, makeParams("b1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 if user is neither guest nor host", async () => {
    mockAuth.mockResolvedValue({ user: { id: "stranger", role: "GUEST" } });
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "b1",
      guestId: "guest-1",
      property: { hostId: "host-1", host: { id: "host-1" }, images: [] },
      offers: [],
      guest: { id: "guest-1" },
      review: null,
    });

    const req = new NextRequest("http://localhost:3000/api/bookings/b1");
    const res = await GET(req, makeParams("b1"));
    expect(res.status).toBe(403);
  });

  it("returns booking details for the guest", async () => {
    mockAuth.mockResolvedValue({ user: { id: "guest-1", role: "GUEST" } });
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "b1",
      guestId: "guest-1",
      property: { hostId: "host-1", host: { id: "host-1" }, images: [] },
      offers: [],
      guest: { id: "guest-1" },
      review: null,
    });

    const req = new NextRequest("http://localhost:3000/api/bookings/b1");
    const res = await GET(req, makeParams("b1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isGuest).toBe(true);
    expect(body.isHost).toBe(false);
  });

  it("returns booking details for the host", async () => {
    mockAuth.mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "b1",
      guestId: "guest-1",
      property: { hostId: "host-1", host: { id: "host-1" }, images: [] },
      offers: [],
      guest: { id: "guest-1" },
      review: null,
    });

    const req = new NextRequest("http://localhost:3000/api/bookings/b1");
    const res = await GET(req, makeParams("b1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isHost).toBe(true);
  });
});

describe("PATCH /api/bookings/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/bookings/b1", {
      method: "PATCH",
      body: JSON.stringify({ action: "CANCEL" }),
    });
    const res = await PATCH(req, makeParams("b1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 if booking not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "GUEST" } });
    mockPrisma.booking.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/bookings/b1", {
      method: "PATCH",
      body: JSON.stringify({ action: "CANCEL" }),
    });
    const res = await PATCH(req, makeParams("b1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for unauthorized user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "stranger", role: "GUEST" } });
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "b1",
      guestId: "guest-1",
      property: { hostId: "host-1" },
    });

    const req = new NextRequest("http://localhost:3000/api/bookings/b1", {
      method: "PATCH",
      body: JSON.stringify({ action: "CANCEL" }),
    });
    const res = await PATCH(req, makeParams("b1"));
    expect(res.status).toBe(403);
  });

  it("cancels booking as guest", async () => {
    mockAuth.mockResolvedValue({ user: { id: "guest-1", role: "GUEST" } });
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "b1",
      guestId: "guest-1",
      property: { hostId: "host-1" },
    });
    mockPrisma.booking.update.mockResolvedValue({ id: "b1", status: "CANCELLED" });

    const req = new NextRequest("http://localhost:3000/api/bookings/b1", {
      method: "PATCH",
      body: JSON.stringify({ action: "CANCEL" }),
    });
    const res = await PATCH(req, makeParams("b1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("CANCELLED");
  });

  it("returns 400 for invalid action", async () => {
    mockAuth.mockResolvedValue({ user: { id: "guest-1", role: "GUEST" } });
    mockPrisma.booking.findUnique.mockResolvedValue({
      id: "b1",
      guestId: "guest-1",
      property: { hostId: "host-1" },
    });

    const req = new NextRequest("http://localhost:3000/api/bookings/b1", {
      method: "PATCH",
      body: JSON.stringify({ action: "INVALID" }),
    });
    const res = await PATCH(req, makeParams("b1"));
    expect(res.status).toBe(400);
  });
});

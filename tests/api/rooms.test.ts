import { NextRequest } from "next/server";

// ---- Mock Prisma ----
const mockPrisma = {
  property: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
  $executeRaw: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

import { GET, POST } from "@/app/api/host/rooms/route";
import { PUT, DELETE } from "@/app/api/host/rooms/[id]/route";
import { POST as PROVISION } from "@/app/api/host/rooms/provision/route";
import { auth } from "@/lib/auth";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const makeParams = (id: string) => Promise.resolve({ id }) as Promise<{ id: string }>;

// ── GET /api/host/rooms ────────────────────────────────────────────────────

describe("GET /api/host/rooms", () => {
  beforeEach(() => jest.resetAllMocks());

  it("returns 401 when not authenticated", async () => {
    (mockAuth as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/host/rooms");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 for GUEST role", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "u1", role: "GUEST" } });
    const req = new NextRequest("http://localhost:3000/api/host/rooms");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns rooms for HOST", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      { id: "room-1", propertyId: "prop-1", name: "Room 1", maxGuests: 2, isActive: 1 },
    ]);

    const req = new NextRequest("http://localhost:3000/api/host/rooms");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].name).toBe("Room 1");
  });
});

// ── POST /api/host/rooms ───────────────────────────────────────────────────

describe("POST /api/host/rooms", () => {
  beforeEach(() => jest.resetAllMocks());

  it("returns 401 when not authenticated", async () => {
    (mockAuth as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/host/rooms", {
      method: "POST",
      body: JSON.stringify({ propertyId: "prop-1", name: "Suite" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when propertyId or name is missing", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    const req = new NextRequest("http://localhost:3000/api/host/rooms", {
      method: "POST",
      body: JSON.stringify({ name: "Suite" }), // missing propertyId
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when property belongs to another host", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.property.findFirst.mockResolvedValue(null); // no ownership match

    const req = new NextRequest("http://localhost:3000/api/host/rooms", {
      method: "POST",
      body: JSON.stringify({ propertyId: "prop-other", name: "Suite" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("creates a room and returns 201", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    // ownership check passes (uses prisma.property.findFirst)
    mockPrisma.property.findFirst.mockResolvedValue({ id: "prop-1" });
    // INSERT uses $executeRaw (tagged template)
    mockPrisma.$executeRaw.mockResolvedValue(1);
    // SELECT new room
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      { id: "room-new", propertyId: "prop-1", name: "Suite", maxGuests: 2, isActive: 1, createdAt: new Date().toISOString() },
    ]);

    const req = new NextRequest("http://localhost:3000/api/host/rooms", {
      method: "POST",
      body: JSON.stringify({ propertyId: "prop-1", name: "Suite", maxGuests: 3 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("Suite");
  });
});

// ── PUT /api/host/rooms/[id] ───────────────────────────────────────────────

describe("PUT /api/host/rooms/[id]", () => {
  beforeEach(() => jest.resetAllMocks());

  it("returns 401 when not authenticated", async () => {
    (mockAuth as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/host/rooms/room-1", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await PUT(req, { params: makeParams("room-1") });
    expect(res.status).toBe(401);
  });

  it("returns 404 when room not owned by host", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]); // ownership check fails

    const req = new NextRequest("http://localhost:3000/api/host/rooms/room-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Renamed" }),
    });
    const res = await PUT(req, { params: makeParams("room-1") });
    expect(res.status).toBe(404);
  });

  it("renames a room successfully", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    // ownership check
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: "room-1" }]);
    // UPDATE
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);
    // SELECT updated room
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
      { id: "room-1", propertyId: "prop-1", name: "Renamed Room", maxGuests: 2, isActive: 1 },
    ]);

    const req = new NextRequest("http://localhost:3000/api/host/rooms/room-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Renamed Room" }),
    });
    const res = await PUT(req, { params: makeParams("room-1") });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Renamed Room");
  });
});

// ── DELETE /api/host/rooms/[id] ────────────────────────────────────────────

describe("DELETE /api/host/rooms/[id]", () => {
  beforeEach(() => jest.resetAllMocks());

  it("returns 401 when not authenticated", async () => {
    (mockAuth as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/host/rooms/room-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: makeParams("room-1") });
    expect(res.status).toBe(401);
  });

  it("returns 404 when room not owned by host", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/host/rooms/room-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: makeParams("room-1") });
    expect(res.status).toBe(404);
  });

  it("soft-deletes the room", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: "room-1" }]); // ownership
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([]); // UPDATE isActive=0

    const req = new NextRequest("http://localhost:3000/api/host/rooms/room-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: makeParams("room-1") });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ── POST /api/host/rooms/provision ─────────────────────────────────────────

describe("POST /api/host/rooms/provision", () => {
  beforeEach(() => jest.resetAllMocks());

  it("returns 401 when not authenticated", async () => {
    (mockAuth as jest.Mock).mockResolvedValue(null);
    const req = new NextRequest("http://localhost:3000/api/host/rooms/provision", { method: "POST" });
    const res = await PROVISION(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 for GUEST role", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "u1", role: "GUEST" } });
    const req = new NextRequest("http://localhost:3000/api/host/rooms/provision", { method: "POST" });
    const res = await PROVISION(req);
    expect(res.status).toBe(401);
  });

  it("skips properties that already have rooms", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.property.findMany.mockResolvedValue([
      { id: "prop-1", title: "Villa", bedrooms: 3 },
    ]);
    // category check → STAY
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ category: "STAY" }]);
    // existing room count → 3 (already has rooms)
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ cnt: 3 }]);

    const req = new NextRequest("http://localhost:3000/api/host/rooms/provision", { method: "POST" });
    const res = await PROVISION(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.created).toBe(0);
    expect(data.provisioned).toHaveLength(0);
  });

  it("creates rooms for properties with 0 rooms", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.property.findMany.mockResolvedValue([
      { id: "prop-1", title: "Villa", bedrooms: 2 },
    ]);
    // category check → STAY
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ category: "STAY" }]);
    // existing room count → 0
    mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ cnt: 0 }]);
    // INSERT room-1, INSERT room-2
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/host/rooms/provision", { method: "POST" });
    const res = await PROVISION(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.created).toBe(2);
    expect(data.provisioned[0].roomsCreated).toBe(2);
  });

  it("skips TRANSPORT properties", async () => {
    (mockAuth as jest.Mock).mockResolvedValue({ user: { id: "host-1", role: "HOST" } });
    mockPrisma.property.findMany.mockResolvedValue([
      { id: "prop-transport", title: "Toyota Van", bedrooms: 0 },
    ]);

    const req = new NextRequest("http://localhost:3000/api/host/rooms/provision", { method: "POST" });
    const res = await PROVISION(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.created).toBe(0);
  });
});

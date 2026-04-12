import { NextRequest } from "next/server";

// ---- Mock Prisma ----
const mockPrisma = {
  property: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

import { GET, PATCH, DELETE } from "@/app/api/properties/[id]/route";
import { auth } from "@/lib/auth";

const mockAuth = auth as jest.Mock;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/properties/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 404 if property not found", async () => {
    mockPrisma.property.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/properties/p1");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(404);
  });

  it("returns property with enriched fields", async () => {
    mockPrisma.property.findUnique.mockResolvedValue({
      id: "p1",
      title: "Beach Villa",
      reviews: [{ rating: 4 }, { rating: 5 }],
      host: { id: "h1", name: "Host" },
      images: [],
      amenities: [],
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ category: "STAY", pricePerKm: null }]);

    const req = new NextRequest("http://localhost:3000/api/properties/p1");
    const res = await GET(req, makeParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.category).toBe("STAY");
    expect(body.avgRating).toBe(4.5);
    expect(body.reviewCount).toBe(2);
  });

  it("returns null avgRating for no reviews", async () => {
    mockPrisma.property.findUnique.mockResolvedValue({
      id: "p1",
      reviews: [],
      host: { id: "h1" },
      images: [],
      amenities: [],
    });
    mockPrisma.$queryRaw.mockResolvedValue([{ category: "TRANSPORT", pricePerKm: 0.5 }]);

    const req = new NextRequest("http://localhost:3000/api/properties/p1");
    const res = await GET(req, makeParams("p1"));
    const body = await res.json();
    expect(body.avgRating).toBeNull();
    expect(body.pricePerKm).toBe(0.5);
  });
});

describe("PATCH /api/properties/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/properties/p1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
    });
    const res = await PATCH(req, makeParams("p1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 if property not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "h1", role: "HOST" } });
    mockPrisma.property.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/properties/p1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Title" }),
    });
    const res = await PATCH(req, makeParams("p1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 if user is not the host or admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "other-user", role: "HOST" } });
    mockPrisma.property.findUnique.mockResolvedValue({ id: "p1", hostId: "h1" });

    const req = new NextRequest("http://localhost:3000/api/properties/p1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
    });
    const res = await PATCH(req, makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("updates property as the owner", async () => {
    mockAuth.mockResolvedValue({ user: { id: "h1", role: "HOST" } });
    mockPrisma.property.findUnique.mockResolvedValue({ id: "p1", hostId: "h1" });
    mockPrisma.property.update.mockResolvedValue({
      id: "p1",
      title: "Updated Title Here",
      amenities: [],
      images: [],
    });

    const req = new NextRequest("http://localhost:3000/api/properties/p1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Title Here" }),
    });
    const res = await PATCH(req, makeParams("p1"));
    expect(res.status).toBe(200);
  });

  it("allows ADMIN to update any property", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockPrisma.property.findUnique.mockResolvedValue({ id: "p1", hostId: "h1" });
    mockPrisma.property.update.mockResolvedValue({
      id: "p1",
      title: "Admin Updated",
      amenities: [],
      images: [],
    });

    const req = new NextRequest("http://localhost:3000/api/properties/p1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Admin Updated" }),
    });
    const res = await PATCH(req, makeParams("p1"));
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/properties/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/properties/p1");
    const res = await DELETE(req, makeParams("p1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 if property not found", async () => {
    mockAuth.mockResolvedValue({ user: { id: "h1", role: "HOST" } });
    mockPrisma.property.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/properties/p1");
    const res = await DELETE(req, makeParams("p1"));
    expect(res.status).toBe(404);
  });

  it("returns 403 for non-owner non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "stranger", role: "HOST" } });
    mockPrisma.property.findUnique.mockResolvedValue({ id: "p1", hostId: "h1" });

    const req = new NextRequest("http://localhost:3000/api/properties/p1");
    const res = await DELETE(req, makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("soft-deletes property (sets INACTIVE)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "h1", role: "HOST" } });
    mockPrisma.property.findUnique.mockResolvedValue({ id: "p1", hostId: "h1" });
    mockPrisma.property.update.mockResolvedValue({ id: "p1", status: "INACTIVE" });

    const req = new NextRequest("http://localhost:3000/api/properties/p1");
    const res = await DELETE(req, makeParams("p1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockPrisma.property.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "INACTIVE" },
    });
  });
});

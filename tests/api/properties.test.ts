import { NextRequest } from "next/server";

// ---- Mock Prisma ----
const mockPrisma = {
  property: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

import { GET, POST } from "@/app/api/properties/route";
import { auth } from "@/lib/auth";

const mockAuth = auth as jest.Mock;

describe("GET /api/properties", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns paginated properties", async () => {
    mockPrisma.property.count.mockResolvedValue(2);
    mockPrisma.property.findMany.mockResolvedValue([
      {
        id: "p1",
        title: "Villa 1",
        reviews: [{ rating: 4 }, { rating: 5 }],
      },
      {
        id: "p2",
        title: "Villa 2",
        reviews: [],
      },
    ]);

    const req = new NextRequest("http://localhost:3000/api/properties");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
  });

  it("filters by district", async () => {
    mockPrisma.property.count.mockResolvedValue(0);
    mockPrisma.property.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/properties?district=Galle");
    await GET(req);

    expect(mockPrisma.property.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ district: "Galle" }),
      })
    );
  });

  it("filters by price range", async () => {
    mockPrisma.property.count.mockResolvedValue(0);
    mockPrisma.property.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/properties?minPrice=50&maxPrice=200");
    await GET(req);

    expect(mockPrisma.property.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          pricePerNight: { gte: 50, lte: 200 },
        }),
      })
    );
  });

  it("filters by category via raw query", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    mockPrisma.property.count.mockResolvedValue(2);
    mockPrisma.property.findMany.mockResolvedValue([
      { id: "p1", title: "Car", reviews: [] },
      { id: "p2", title: "Van", reviews: [] },
    ]);

    const req = new NextRequest("http://localhost:3000/api/properties?category=TRANSPORT");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
  });

  it("returns empty data for category with no results", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/properties?category=TRANSPORT");
    const res = await GET(req);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("calculates average rating", async () => {
    mockPrisma.property.count.mockResolvedValue(1);
    mockPrisma.property.findMany.mockResolvedValue([
      {
        id: "p1",
        reviews: [{ rating: 3 }, { rating: 4 }, { rating: 5 }],
      },
    ]);

    const req = new NextRequest("http://localhost:3000/api/properties");
    const res = await GET(req);
    const body = await res.json();
    expect(body.data[0].avgRating).toBe(4);
    expect(body.data[0].reviewCount).toBe(3);
  });
});

describe("POST /api/properties", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/properties", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-host users", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "guest-1", role: "GUEST", name: "Guest" },
    });

    const req = new NextRequest("http://localhost:3000/api/properties", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid data", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "host-1", role: "HOST", name: "Host" },
    });

    const req = new NextRequest("http://localhost:3000/api/properties", {
      method: "POST",
      body: JSON.stringify({ title: "Hi" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("creates a STAY property successfully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "host-1", role: "HOST", name: "Host" },
    });
    mockPrisma.property.create.mockResolvedValue({
      id: "prop-1",
      title: "Beach Villa",
      status: "PENDING_APPROVAL",
      amenities: [],
      images: [],
    });
    mockPrisma.$executeRaw.mockResolvedValue(1);

    const req = new NextRequest("http://localhost:3000/api/properties", {
      method: "POST",
      body: JSON.stringify({
        title: "Beautiful Beach Villa",
        description: "A stunning villa right on the beach with amazing ocean views and modern amenities",
        propertyType: "VILLA",
        category: "STAY",
        address: "123 Beach Road, Galle",
        district: "Galle",
        latitude: 6.0535,
        longitude: 80.221,
        pricePerNight: 150,
        minPrice: 100,
        maxGuests: 6,
        bedrooms: 3,
        bathrooms: 2,
        beds: 4,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockPrisma.property.create).toHaveBeenCalled();
  });

  it("allows ADMIN to create properties", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN", name: "Admin" },
    });
    mockPrisma.property.create.mockResolvedValue({
      id: "prop-2",
      title: "Admin Property",
      status: "PENDING_APPROVAL",
      amenities: [],
      images: [],
    });
    mockPrisma.$executeRaw.mockResolvedValue(1);

    const req = new NextRequest("http://localhost:3000/api/properties", {
      method: "POST",
      body: JSON.stringify({
        title: "Admin Created Villa",
        description: "A property created by the admin for testing purposes with all amenities",
        propertyType: "HOTEL",
        category: "STAY",
        address: "456 Admin Road",
        district: "Colombo",
        latitude: 6.9271,
        longitude: 79.8612,
        pricePerNight: 200,
        minPrice: 150,
        maxGuests: 10,
        bedrooms: 5,
        bathrooms: 3,
        beds: 6,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

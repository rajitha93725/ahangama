import { NextRequest } from "next/server";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

import { GET, PATCH, DELETE } from "@/app/api/users/[id]/route";
import { auth } from "@/lib/auth";

const mockAuth = auth as jest.Mock;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/users/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns user profile", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      name: "Test User",
      role: "GUEST",
      isActive: true,
      properties: [],
    });

    const req = new NextRequest("http://localhost:3000/api/users/u1");
    const res = await GET(req, makeParams("u1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Test User");
  });

  it("returns 404 if user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/users/u999");
    const res = await GET(req, makeParams("u999"));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/users/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/users/u1", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await PATCH(req, makeParams("u1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 if updating another user (non-admin)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u2", role: "GUEST" } });

    const req = new NextRequest("http://localhost:3000/api/users/u1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Hacked Name" }),
    });
    const res = await PATCH(req, makeParams("u1"));
    expect(res.status).toBe(403);
  });

  it("updates own profile", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "GUEST" } });
    mockPrisma.user.update.mockResolvedValue({
      id: "u1",
      name: "Updated Name",
      email: "test@example.com",
    });

    const req = new NextRequest("http://localhost:3000/api/users/u1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Updated Name" }),
    });
    const res = await PATCH(req, makeParams("u1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Name");
  });

  it("allows ADMIN to update any user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockPrisma.user.update.mockResolvedValue({
      id: "u1",
      name: "Admin Updated",
    });

    const req = new NextRequest("http://localhost:3000/api/users/u1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Admin Updated" }),
    });
    const res = await PATCH(req, makeParams("u1"));
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid profile data", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "GUEST" } });

    const req = new NextRequest("http://localhost:3000/api/users/u1", {
      method: "PATCH",
      body: JSON.stringify({ name: "J" }), // too short
    });
    const res = await PATCH(req, makeParams("u1"));
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/users/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 for non-admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", role: "HOST" } });

    const req = new NextRequest("http://localhost:3000/api/users/u2");
    const res = await DELETE(req, makeParams("u2"));
    expect(res.status).toBe(403);
  });

  it("returns 403 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/users/u1");
    const res = await DELETE(req, makeParams("u1"));
    expect(res.status).toBe(403);
  });

  it("deactivates user as ADMIN", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
    mockPrisma.user.update.mockResolvedValue({ id: "u1", isActive: false });

    const req = new NextRequest("http://localhost:3000/api/users/u1");
    const res = await DELETE(req, makeParams("u1"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

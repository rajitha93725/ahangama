import { NextRequest } from "next/server";

// ---- Mock Prisma ----
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  booking: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  property: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
  compare: jest.fn(),
}));

import { POST } from "@/app/api/auth/register/route";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for invalid input", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "J", email: "bad", password: "short" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 409 if email already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "GUEST",
        phone: "+94771234567",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Email already registered");
  });

  it("returns 409 if phone already exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);  // email free
    mockPrisma.user.findFirst.mockResolvedValue({ id: "existing-phone" }); // phone taken

    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "GUEST",
        phone: "+94771234567",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("Phone number already registered");
  });

  it("returns 201 and creates user with pending approval", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "new-user-1",
      name: "John Doe",
      email: "john@example.com",
      role: "GUEST",
    });

    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "GUEST",
        phone: "+94771234567",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.pendingApproval).toBe(true);
    expect(body.name).toBe("John Doe");
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "john@example.com",
          isActive: false,
        }),
      })
    );
  });

  it("hashes the password before storing", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "new-user-2",
      name: "Jane",
      email: "jane@example.com",
      role: "HOST",
    });

    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "securepass123",
        role: "HOST",
        phone: "+94712345678",
      }),
    });

    await POST(req);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: "hashed_password",
        }),
      })
    );
  });

  // ── phone field (added in this session) ──────────────────────────────────
  it("saves phone number", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "new-user-3",
      name: "Sam",
      email: "sam@example.com",
      role: "GUEST",
    });

    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Sam Silva",
        email: "sam@example.com",
        password: "password123",
        role: "GUEST",
        phone: "+94771234567",
      }),
    });

    await POST(req);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ phone: "+94771234567" }),
      })
    );
  });

  it("returns 400 when phone is omitted (now required)", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Nimal Perera",
        email: "nimal@example.com",
        password: "password123",
        role: "GUEST",
        // phone intentionally omitted
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid phone format", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Bad Phone",
        email: "bad@example.com",
        password: "password123",
        role: "GUEST",
        phone: "abc",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

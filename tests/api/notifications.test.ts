import { NextRequest } from "next/server";

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
};

jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

import { GET, PATCH } from "@/app/api/notifications/route";
import { auth } from "@/lib/auth";

const mockAuth = auth as jest.Mock;

describe("GET /api/notifications", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/notifications");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns notifications with unread count", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.notification.findMany.mockResolvedValue([
      { id: "n1", isRead: false, type: "BOOKING_REQUEST" },
      { id: "n2", isRead: true, type: "OFFER_ACCEPTED" },
      { id: "n3", isRead: false, type: "NEW_REVIEW" },
    ]);

    const req = new NextRequest("http://localhost:3000/api/notifications");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(3);
    expect(body.unreadCount).toBe(2);
  });

  it("returns 0 unread when all are read", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.notification.findMany.mockResolvedValue([
      { id: "n1", isRead: true },
    ]);

    const req = new NextRequest("http://localhost:3000/api/notifications");
    const res = await GET(req);
    const body = await res.json();
    expect(body.unreadCount).toBe(0);
  });
});

describe("PATCH /api/notifications", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/notifications", {
      method: "PATCH",
      body: JSON.stringify({ ids: ["n1"] }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });
});

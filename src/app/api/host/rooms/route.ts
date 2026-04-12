import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

// GET /api/host/rooms?propertyId=... — list rooms for the host's properties
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const propertyId = searchParams.get("propertyId");

  // Verify the property belongs to this host
  if (propertyId) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, hostId: session.user.id },
    });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }
  }

  // Build query — join with Property to enforce host ownership
  const sql = propertyId
    ? `SELECT r.* FROM "Room" r
       INNER JOIN "Property" p ON p.id = r.propertyId
       WHERE p.hostId = ? AND r.propertyId = ? AND r.isActive = 1
       ORDER BY r.createdAt ASC`
    : `SELECT r.* FROM "Room" r
       INNER JOIN "Property" p ON p.id = r.propertyId
       WHERE p.hostId = ? AND r.isActive = 1
       ORDER BY r.propertyId, r.createdAt ASC`;

  const params = propertyId ? [session.user.id, propertyId] : [session.user.id];
  const rooms = await prisma.$queryRawUnsafe<
    { id: string; propertyId: string; name: string; description: string | null; maxGuests: number; isActive: number; createdAt: string }[]
  >(sql, ...params);

  return NextResponse.json(rooms);
}

// POST /api/host/rooms — create a room
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { propertyId, name, description, maxGuests } = body;

  if (!propertyId || !name?.trim()) {
    return NextResponse.json({ error: "propertyId and name are required" }, { status: 400 });
  }

  // Verify ownership
  const property = await prisma.property.findFirst({
    where: { id: propertyId, hostId: session.user.id },
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  const id = randomUUID();
  const guests = Number(maxGuests) || 2;
  const now = new Date().toISOString();

  await prisma.$executeRaw`
    INSERT INTO "Room" (id, propertyId, name, description, maxGuests, isActive, createdAt)
    VALUES (${id}, ${propertyId}, ${name.trim()}, ${description ?? null}, ${guests}, 1, ${now})
  `;

  const [room] = await prisma.$queryRawUnsafe<{ id: string; propertyId: string; name: string; description: string | null; maxGuests: number; isActive: number; createdAt: string }[]>(
    `SELECT * FROM "Room" WHERE id = ?`,
    id
  );

  return NextResponse.json(room, { status: 201 });
}

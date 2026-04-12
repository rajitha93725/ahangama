import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

// POST /api/host/rooms/provision
// Idempotently creates default rooms (Room 1, Room 2, …) for all STAY properties
// that have a bedrooms count > 0 but currently have 0 rooms in the Room table.
// Safe to call on every calendar load — does nothing for properties that already have rooms.
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all STAY properties for this host (transport listings don't have rooms)
  const properties = await prisma.property.findMany({
    where: { hostId: session.user.id },
    select: { id: true, title: true, bedrooms: true },
  });

  // Filter to those that have 0 rooms using raw SQL (Room table unknown to Prisma client)
  let totalCreated = 0;
  const provisioned: { propertyId: string; title: string; roomsCreated: number }[] = [];

  for (const property of properties) {
    if (!property.bedrooms || property.bedrooms <= 0) continue;

    // Skip properties that are TRANSPORT (category check)
    const catRow = await prisma.$queryRawUnsafe<{ category: string }[]>(
      `SELECT category FROM "Property" WHERE id = ?`,
      property.id
    );
    if (catRow[0]?.category === "TRANSPORT") continue;

    // Count existing active rooms
    const countRow = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
      `SELECT COUNT(*) as cnt FROM "Room" WHERE propertyId = ? AND isActive = 1`,
      property.id
    );
    const existingCount = Number(countRow[0]?.cnt ?? 0);

    if (existingCount > 0) continue; // Already has rooms — skip

    // Create Room 1 … Room N
    const now = new Date().toISOString();
    for (let i = 1; i <= property.bedrooms; i++) {
      const roomId = randomUUID();
      await prisma.$queryRawUnsafe(
        `INSERT INTO "Room" (id, propertyId, name, maxGuests, isActive, createdAt) VALUES (?, ?, ?, 2, 1, ?)`,
        roomId,
        property.id,
        `Room ${i}`,
        now
      );
      totalCreated++;
    }

    provisioned.push({
      propertyId: property.id,
      title: property.title,
      roomsCreated: property.bedrooms,
    });
  }

  return NextResponse.json({ created: totalCreated, provisioned });
}

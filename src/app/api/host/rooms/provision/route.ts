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

  const properties = await prisma.property.findMany({
    where: { hostId: session.user.id },
    select: { id: true, title: true, bedrooms: true },
  });

  if (properties.length === 0) {
    return NextResponse.json({ created: 0, provisioned: [] });
  }

  const propertyIds = properties.map((p) => p.id);
  const inClause = propertyIds.map((_, i) => `$${i + 1}`).join(", ");

  // Bulk: categories for all properties in one query
  const catRows = await prisma.$queryRawUnsafe<{ id: string; category: string }[]>(
    `SELECT id, category FROM "Property" WHERE id IN (${inClause})`,
    ...propertyIds
  );
  const categoryMap = Object.fromEntries(catRows.map((r) => [r.id, r.category]));

  // Bulk: existing active room counts for all properties in one query
  const countRows = await prisma.$queryRawUnsafe<{ propertyId: string; cnt: bigint }[]>(
    `SELECT "propertyId", COUNT(*) as cnt FROM "Room"
     WHERE "propertyId" IN (${inClause}) AND "isActive" = true
     GROUP BY "propertyId"`,
    ...propertyIds
  );
  const roomCountMap = Object.fromEntries(countRows.map((r) => [r.propertyId, Number(r.cnt)]));

  // Build a single batch INSERT for all properties that need rooms
  let totalCreated = 0;
  const provisioned: { propertyId: string; title: string; roomsCreated: number }[] = [];
  const allRows: unknown[] = [];
  const allPlaceholders: string[] = [];
  let p = 1;

  for (const property of properties) {
    if (!property.bedrooms || property.bedrooms <= 0) continue;
    if (categoryMap[property.id] === "TRANSPORT") continue;
    if ((roomCountMap[property.id] ?? 0) > 0) continue;

    for (let i = 1; i <= property.bedrooms; i++) {
      allRows.push(randomUUID(), property.id, `Room ${i}`);
      allPlaceholders.push(`($${p++}, $${p++}, $${p++}, 2, true, NOW())`);
    }
    totalCreated += property.bedrooms;
    provisioned.push({ propertyId: property.id, title: property.title, roomsCreated: property.bedrooms });
  }

  if (allRows.length > 0) {
    await prisma.$queryRawUnsafe(
      `INSERT INTO "Room" (id, "propertyId", name, "maxGuests", "isActive", "createdAt") VALUES ${allPlaceholders.join(", ")}`,
      ...allRows
    );
  }

  return NextResponse.json({ created: totalCreated, provisioned });
}

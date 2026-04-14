import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await req.json(); // "approve" | "reject" | "activate" | "deactivate" | "suspend"

  const statusMap: Record<string, string> = {
    approve: "ACTIVE",
    reject: "SUSPENDED",
    activate: "ACTIVE",
    deactivate: "INACTIVE",
    suspend: "SUSPENDED",
  };

  if (!statusMap[action]) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const property = await prisma.property.update({
    where: { id },
    data: { status: statusMap[action] },
    select: { id: true, title: true, status: true, hostId: true },
  });

  // On first approval, seed a default 10.0 rating so the listing looks great from day one
  if (action === "approve") {
    const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "PropertyRating" WHERE propertyId = ? AND isSeeded = 1 LIMIT 1`,
      id
    );
    if (existing.length === 0) {
      const now = new Date().toISOString();
      await prisma.$queryRawUnsafe(
        `INSERT INTO "PropertyRating" (id, propertyId, bookingId, guestId, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, avgScore, isSeeded, createdAt)
         VALUES (?, ?, NULL, NULL, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 1, ?)`,
        randomUUID(), id, now
      );
    }
  }

  return NextResponse.json(property);
}

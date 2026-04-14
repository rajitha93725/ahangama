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

  // On first approval, seed 10 default perfect ratings (simulates 10 happy reviewers)
  if (action === "approve") {
    const existingCount = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
      `SELECT COUNT(*) as cnt FROM "PropertyRating" WHERE propertyId = ? AND isSeeded = 1`,
      id
    );
    const seededCount = Number(existingCount[0]?.cnt ?? 0);
    if (seededCount < 10) {
      const now = new Date();
      for (let i = seededCount; i < 10; i++) {
        // Stagger createdAt by one day each so they look like separate reviewers
        const ts = new Date(now.getTime() - i * 86400000).toISOString();
        await prisma.$queryRawUnsafe(
          `INSERT INTO "PropertyRating" (id, propertyId, bookingId, guestId, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, avgScore, isSeeded, createdAt)
           VALUES (?, ?, NULL, NULL, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 1, ?)`,
          randomUUID(), id, ts
        );
      }
    }
  }

  return NextResponse.json(property);
}

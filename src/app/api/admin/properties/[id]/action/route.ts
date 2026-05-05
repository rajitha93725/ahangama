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

  // On first approval, seed 10 default perfect ratings (5 questions × 2 pts = 10 each)
  if (action === "approve") {
    const existingCount = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
      `SELECT COUNT(*) as cnt FROM "PropertyRating" WHERE "propertyId" = $1 AND "isSeeded" = true`,
      id
    );
    const seededCount = Number(existingCount[0]?.cnt ?? 0);
    if (seededCount < 10) {
      const now = new Date();
      const rows: unknown[] = [];
      const placeholders: string[] = [];
      let p = 1;
      for (let i = seededCount; i < 10; i++) {
        const ts = new Date(now.getTime() - i * 86400000).toISOString();
        rows.push(randomUUID(), id, ts);
        placeholders.push(`($${p++}, $${p++}, NULL, NULL, 10, 10, 10, 10, 10, 0, 0, 0, 0, 0, 10, true, $${p++}::timestamp)`);
      }
      await prisma.$queryRawUnsafe(
        `INSERT INTO "PropertyRating" (id, "propertyId", "bookingId", "guestId", q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, "avgScore", "isSeeded", "createdAt")
         VALUES ${placeholders.join(", ")}`,
        ...rows
      );
    }
  }

  return NextResponse.json(property);
}

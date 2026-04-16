import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

// GET — return all 10 seeded rating rows individually (each guest's own scores + comment)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  const rows = await prisma.$queryRawUnsafe<{
    id: string; q1: number; q2: number; q3: number; q4: number; q5: number;
    avgScore: number; comment: string | null; createdAt: string;
  }[]>(
    `SELECT id, q1, q2, q3, q4, q5, avgScore, comment, createdAt
     FROM "PropertyRating" WHERE propertyId = ? AND isSeeded = 1
     ORDER BY createdAt DESC`,
    id
  );

  // If fewer than 10 rows exist, pad with defaults
  const guests = Array.from({ length: 10 }, (_, i) => {
    const row = rows[i];
    return {
      id: row?.id ?? null,
      q1: row?.q1 ?? 10, q2: row?.q2 ?? 10, q3: row?.q3 ?? 10,
      q4: row?.q4 ?? 10, q5: row?.q5 ?? 10,
      avgScore: row?.avgScore ?? 10,
      comment: row?.comment ?? "",
    };
  });

  return NextResponse.json({ guests });
}

// PATCH — save all 10 seeded guests individually with their own scores + comments
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const guests = body.guests as Array<{
    q1: number; q2: number; q3: number; q4: number; q5: number; comment?: string;
  }>;

  if (!Array.isArray(guests) || guests.length !== 10) {
    return NextResponse.json({ error: "Expected array of 10 guest ratings" }, { status: 400 });
  }

  for (const g of guests) {
    const qs = [g.q1, g.q2, g.q3, g.q4, g.q5];
    if (qs.some((q) => typeof q !== "number" || q < 1 || q > 10)) {
      return NextResponse.json({ error: "All scores must be 1–10" }, { status: 400 });
    }
  }

  // Delete all existing seeded rows and re-insert with individual values
  await prisma.$queryRawUnsafe(
    `DELETE FROM "PropertyRating" WHERE propertyId = ? AND isSeeded = 1`,
    id
  );

  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const g = guests[i];
    const avg = parseFloat(([g.q1, g.q2, g.q3, g.q4, g.q5].reduce((a, b) => a + b, 0) / 5).toFixed(2));
    const ts = new Date(now.getTime() - i * 86400000).toISOString();
    await prisma.$queryRawUnsafe(
      `INSERT INTO "PropertyRating" (id, propertyId, bookingId, guestId, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, avgScore, isSeeded, comment, createdAt)
       VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, ?, 1, ?, ?)`,
      randomUUID(), id, g.q1, g.q2, g.q3, g.q4, g.q5, avg,
      g.comment?.trim() || null, ts
    );
  }

  return NextResponse.json({ saved: 10 });
}

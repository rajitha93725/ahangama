import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

// GET — return scores from the first seeded rating (all 10 share the same scores)
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
    q1: number; q2: number; q3: number; q4: number; q5: number;
    q6: number; q7: number; q8: number; q9: number; q10: number; avgScore: number; count: number;
  }[]>(
    `SELECT q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, avgScore, COUNT(*) as count
     FROM "PropertyRating" WHERE propertyId = ? AND isSeeded = 1 LIMIT 1`,
    id
  );
  return NextResponse.json(rows[0] ?? null);
}

// PATCH — upsert all 10 seeded ratings with the same score profile
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
  const qs = [body.q1, body.q2, body.q3, body.q4, body.q5, body.q6, body.q7, body.q8, body.q9, body.q10];

  if (qs.some((q) => typeof q !== "number" || q < 1 || q > 10)) {
    return NextResponse.json({ error: "All 10 scores must be numbers between 1 and 10" }, { status: 400 });
  }

  const avg = parseFloat((qs.reduce((a, b) => a + b, 0) / 10).toFixed(2));

  // Delete existing seeded rows and recreate all 10 with new scores
  await prisma.$queryRawUnsafe(
    `DELETE FROM "PropertyRating" WHERE propertyId = ? AND isSeeded = 1`,
    id
  );

  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const ts = new Date(now.getTime() - i * 86400000).toISOString();
    await prisma.$queryRawUnsafe(
      `INSERT INTO "PropertyRating" (id, propertyId, bookingId, guestId, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, avgScore, isSeeded, createdAt)
       VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      randomUUID(), id, ...qs, avg, ts
    );
  }

  return NextResponse.json({ avgScore: avg, count: 10 });
}

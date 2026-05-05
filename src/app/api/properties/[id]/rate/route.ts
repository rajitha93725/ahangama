import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: propertyId } = await params;
  const body = await req.json();
  const { bookingId, scores, comment } = body as {
    bookingId: string;
    scores: number[]; // 5 values, each 1-10 (each question worth 2 points → total /5 * 10)
    comment?: string;
  };

  if (!bookingId || !Array.isArray(scores) || scores.length !== 5) {
    return NextResponse.json({ error: "Invalid rating data — 5 scores required" }, { status: 400 });
  }
  if (scores.some((s) => typeof s !== "number" || s < 1 || s > 10)) {
    return NextResponse.json({ error: "Each score must be between 1 and 10" }, { status: 400 });
  }

  // Verify booking belongs to guest and is COMPLETED
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { guestId: true, propertyId: true, status: true },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.propertyId !== propertyId) return NextResponse.json({ error: "Booking mismatch" }, { status: 400 });
  if (booking.guestId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (booking.status !== "COMPLETED") return NextResponse.json({ error: "Can only rate completed bookings" }, { status: 400 });

  // Prevent duplicate rating for same booking
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "PropertyRating" WHERE "bookingId" = $1 LIMIT 1`,
    bookingId
  );
  if (existing.length > 0) {
    return NextResponse.json({ error: "You have already rated this booking" }, { status: 409 });
  }

  const [q1, q2, q3, q4, q5] = scores;
  // avgScore = sum of 5 scores / 5 → gives 0–10 range
  const avgScore = parseFloat((scores.reduce((a, b) => a + b, 0) / 5).toFixed(2));

  await prisma.$queryRawUnsafe(
    `INSERT INTO "PropertyRating" (id, "propertyId", "bookingId", "guestId", q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, "avgScore", "isSeeded", comment, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 0, 0, 0, $10, false, $11, NOW())`,
    randomUUID(), propertyId, bookingId, session.user.id,
    q1, q2, q3, q4, q5,
    avgScore, comment ?? null
  );

  return NextResponse.json({ avgScore: parseFloat(avgScore.toFixed(1)) }, { status: 201 });
}

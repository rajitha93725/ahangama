import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
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
    scores: number[];
    comment?: string;
  };

  if (!bookingId || !Array.isArray(scores) || scores.length !== 5) {
    return NextResponse.json({ error: "Invalid rating data — 5 scores required" }, { status: 400 });
  }
  if (scores.some((s) => typeof s !== "number" || s < 1 || s > 10)) {
    return NextResponse.json({ error: "Each score must be between 1 and 10" }, { status: 400 });
  }

  const { data: booking } = await supabaseAdmin
    .from("Booking")
    .select("guestId, propertyId, status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.propertyId !== propertyId) return NextResponse.json({ error: "Booking mismatch" }, { status: 400 });
  if (booking.guestId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (booking.status !== "COMPLETED") return NextResponse.json({ error: "Can only rate completed bookings" }, { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("PropertyRating")
    .select("id")
    .eq("bookingId", bookingId)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "You have already rated this booking" }, { status: 409 });

  const [q1, q2, q3, q4, q5] = scores;
  const avgScore = parseFloat((scores.reduce((a, b) => a + b, 0) / 5).toFixed(2));

  await supabaseAdmin.from("PropertyRating").insert({
    id: randomUUID(),
    propertyId,
    bookingId,
    guestId: session.user.id,
    q1, q2, q3, q4, q5,
    q6: 0, q7: 0, q8: 0, q9: 0, q10: 0,
    avgScore,
    isSeeded: false,
    comment: comment ?? null,
  });

  return NextResponse.json({ avgScore: parseFloat(avgScore.toFixed(1)) }, { status: 201 });
}

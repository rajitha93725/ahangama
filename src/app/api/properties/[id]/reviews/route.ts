import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ReviewSchema } from "@/lib/validations";
import { randomUUID } from "crypto";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: reviews } = await supabaseAdmin
    .from("Review")
    .select("*")
    .eq("propertyId", id)
    .order("createdAt", { ascending: false });

  if (!reviews?.length) return NextResponse.json([]);

  const authorIds = [...new Set(reviews.map((r: { authorId: string }) => r.authorId))];
  const { data: authors } = await supabaseAdmin
    .from("User")
    .select("id, name, image")
    .in("id", authorIds);

  const authorMap = Object.fromEntries((authors || []).map((a: { id: string; name: string | null; image: string | null }) => [a.id, a]));

  return NextResponse.json(
    reviews.map((r: { authorId: string; [key: string]: unknown }) => ({
      ...r,
      author: authorMap[r.authorId] ?? { id: r.authorId, name: null, image: null },
    }))
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: propertyId } = await params;
  const body = await req.json();
  const result = ReviewSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { data: booking } = await supabaseAdmin
    .from("Booking")
    .select("id, propertyId, guestId")
    .eq("propertyId", propertyId)
    .eq("guestId", session.user.id)
    .eq("status", "COMPLETED")
    .is("review", null)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json(
      { error: "You must have completed a stay to review this property" },
      { status: 400 }
    );
  }

  const { data: property } = await supabaseAdmin.from("Property").select("hostId").eq("id", propertyId).single();
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: review } = await supabaseAdmin
    .from("Review")
    .insert({
      id: randomUUID(),
      ...result.data,
      propertyId,
      bookingId: booking.id,
      authorId: session.user.id,
      hostId: property.hostId,
    })
    .select()
    .single();

  const { data: author } = await supabaseAdmin.from("User").select("id, name, image").eq("id", session.user.id).single();

  return NextResponse.json({ ...review, author }, { status: 201 });
}

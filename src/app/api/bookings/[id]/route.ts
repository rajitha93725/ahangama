import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: booking } = await supabaseAdmin.from("Booking").select("*").eq("id", id).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [
    { data: guest },
    { data: property },
    { data: offers },
    { data: review },
  ] = await Promise.all([
    supabaseAdmin.from("User").select("id, name, image, email").eq("id", booking.guestId).single(),
    supabaseAdmin.from("Property").select("*").eq("id", booking.propertyId).single(),
    supabaseAdmin.from("Offer").select("*").eq("bookingId", id).order("createdAt"),
    supabaseAdmin.from("Review").select("*").eq("bookingId", id).maybeSingle(),
  ]);

  const [{ data: host }, { data: propertyImages }, { data: senders }] = await Promise.all([
    supabaseAdmin.from("User").select("id, name, image").eq("id", property.hostId).single(),
    supabaseAdmin.from("PropertyImage").select("url, alt").eq("propertyId", booking.propertyId).eq("isPrimary", true).limit(1),
    supabaseAdmin.from("User").select("id, name, image, role").in("id", [...new Set((offers || []).map((o: { senderId: string }) => o.senderId))]),
  ]);

  const senderMap = Object.fromEntries((senders || []).map((s: { id: string; [key: string]: unknown }) => [s.id, s]));

  const enrichedOffers = (offers || []).map((o: { senderId: string; [key: string]: unknown }) => ({
    ...o,
    sender: senderMap[o.senderId] ?? { id: o.senderId, name: null, image: null, role: null },
  }));

  const fullProperty = {
    ...property,
    host,
    images: propertyImages || [],
  };

  const isGuest = booking.guestId === session.user.id;
  const isHost = property.hostId === session.user.id;
  if (!isGuest && !isHost && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ ...booking, guest, property: fullProperty, offers: enrichedOffers, review, isGuest, isHost });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: booking } = await supabaseAdmin.from("Booking").select("*").eq("id", id).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: property } = await supabaseAdmin.from("Property").select("hostId").eq("id", booking.propertyId).single();
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isGuest = booking.guestId === session.user.id;
  const isHost = property.hostId === session.user.id;
  if (!isGuest && !isHost) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action } = await req.json();

  if (action === "CANCEL" && (isGuest || isHost)) {
    const { data: updated } = await supabaseAdmin
      .from("Booking")
      .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

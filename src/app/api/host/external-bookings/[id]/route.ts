import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_SOURCES = ["BOOKING_COM", "AIRBNB", "AGODA", "WALK_ON", "OTHER"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: hostProperties } = await supabaseAdmin.from("Property").select("id").eq("hostId", session.user.id);
  const hostPropertyIds = (hostProperties || []).map((p: { id: string }) => p.id);

  const { data: existing } = await supabaseAdmin
    .from("ExternalBooking")
    .select("id, roomId, checkIn, checkOut")
    .eq("id", id)
    .in("propertyId", hostPropertyIds)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const body = await req.json();
  const { checkIn, checkOut, source, guestName, notes } = body;

  if (source && !VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: `source must be one of: ${VALID_SOURCES.join(", ")}` }, { status: 400 });
  }

  const newCheckIn = checkIn ? new Date(checkIn) : new Date(existing.checkIn);
  const newCheckOut = checkOut ? new Date(checkOut) : new Date(existing.checkOut);

  if (isNaN(newCheckIn.getTime()) || isNaN(newCheckOut.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (newCheckOut <= newCheckIn) {
    return NextResponse.json({ error: "checkOut must be after checkIn" }, { status: 400 });
  }

  if (checkIn || checkOut) {
    const { data: conflict } = await supabaseAdmin
      .from("ExternalBooking")
      .select("id")
      .eq("roomId", existing.roomId)
      .eq("status", "BOOKED")
      .neq("id", id)
      .lt("checkIn", newCheckOut.toISOString())
      .gt("checkOut", newCheckIn.toISOString())
      .maybeSingle();
    if (conflict) {
      return NextResponse.json({ error: "Room already has another booking for this period" }, { status: 409 });
    }
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (checkIn) updateData.checkIn = newCheckIn.toISOString();
  if (checkOut) updateData.checkOut = newCheckOut.toISOString();
  if (source) updateData.source = source;
  if (guestName !== undefined) updateData.guestName = guestName || null;
  if (notes !== undefined) updateData.notes = notes || null;

  const { data: booking } = await supabaseAdmin.from("ExternalBooking").update(updateData).eq("id", id).select().single();
  return NextResponse.json(booking);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: hostProperties } = await supabaseAdmin.from("Property").select("id").eq("hostId", session.user.id);
  const hostPropertyIds = (hostProperties || []).map((p: { id: string }) => p.id);

  const { data: existing } = await supabaseAdmin
    .from("ExternalBooking")
    .select("id")
    .eq("id", id)
    .in("propertyId", hostPropertyIds)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  await supabaseAdmin.from("ExternalBooking").delete().eq("id", id);
  return NextResponse.json({ success: true });
}

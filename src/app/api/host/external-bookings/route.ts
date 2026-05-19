import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

const VALID_SOURCES = ["BOOKING_COM", "AIRBNB", "AGODA", "WALK_ON", "OTHER"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { roomId, checkIn, checkOut, source, guestName, notes } = body;

  if (!roomId || !checkIn || !checkOut || !source) {
    return NextResponse.json({ error: "roomId, checkIn, checkOut, and source are required" }, { status: 400 });
  }
  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: `source must be one of: ${VALID_SOURCES.join(", ")}` }, { status: 400 });
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (checkOutDate <= checkInDate) {
    return NextResponse.json({ error: "checkOut must be after checkIn" }, { status: 400 });
  }

  const { data: hostProperties } = await supabaseAdmin.from("Property").select("id").eq("hostId", session.user.id);
  const hostPropertyIds = (hostProperties || []).map((p: { id: string }) => p.id);

  const { data: room } = await supabaseAdmin
    .from("Room")
    .select("id, propertyId")
    .eq("id", roomId)
    .eq("isActive", true)
    .in("propertyId", hostPropertyIds)
    .maybeSingle();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const checkInIso = checkInDate.toISOString();
  const checkOutIso = checkOutDate.toISOString();

  const { data: conflictExt } = await supabaseAdmin
    .from("ExternalBooking")
    .select("id")
    .eq("roomId", roomId)
    .eq("status", "BOOKED")
    .lt("checkIn", checkOutIso)
    .gt("checkOut", checkInIso)
    .maybeSingle();
  if (conflictExt) {
    return NextResponse.json({ error: "Room already has an external booking for this period" }, { status: 409 });
  }

  const { data: conflictInt } = await supabaseAdmin
    .from("Booking")
    .select("id")
    .eq("roomId", roomId)
    .in("status", ["ACCEPTED", "COMPLETED"])
    .lt("checkIn", checkOutIso)
    .gt("checkOut", checkInIso)
    .maybeSingle();
  if (conflictInt) {
    return NextResponse.json({ error: "Room already has an internal booking for this period" }, { status: 409 });
  }

  const { data: booking } = await supabaseAdmin
    .from("ExternalBooking")
    .insert({
      id: randomUUID(),
      propertyId: room.propertyId,
      roomId,
      checkIn: checkInIso,
      checkOut: checkOutIso,
      source,
      guestName: guestName ?? null,
      notes: notes ?? null,
      status: "BOOKED",
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  return NextResponse.json(booking, { status: 201 });
}

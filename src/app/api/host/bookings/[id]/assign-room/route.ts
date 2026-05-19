import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { roomId } = body;

  if (!roomId) return NextResponse.json({ error: "roomId is required" }, { status: 400 });

  const { data: hostProperties } = await supabaseAdmin.from("Property").select("id").eq("hostId", session.user.id);
  const hostPropertyIds = (hostProperties || []).map((p: { id: string }) => p.id);

  const { data: booking } = await supabaseAdmin
    .from("Booking")
    .select("id, propertyId, checkIn, checkOut, status")
    .eq("id", id)
    .in("status", ["ACCEPTED", "COMPLETED"])
    .in("propertyId", hostPropertyIds)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found or not yet confirmed" }, { status: 404 });

  const { data: room } = await supabaseAdmin
    .from("Room")
    .select("id, propertyId")
    .eq("id", roomId)
    .eq("isActive", true)
    .in("propertyId", hostPropertyIds)
    .maybeSingle();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.propertyId !== booking.propertyId) {
    return NextResponse.json({ error: "Room does not belong to the same property as this booking" }, { status: 400 });
  }

  const checkInIso = new Date(booking.checkIn).toISOString();
  const checkOutIso = new Date(booking.checkOut).toISOString();

  const { data: conflictExt } = await supabaseAdmin
    .from("ExternalBooking")
    .select("id")
    .eq("roomId", roomId)
    .eq("status", "BOOKED")
    .lt("checkIn", checkOutIso)
    .gt("checkOut", checkInIso)
    .maybeSingle();
  if (conflictExt) {
    return NextResponse.json({ error: "Room has an external booking that conflicts with these dates" }, { status: 409 });
  }

  const { data: conflictInt } = await supabaseAdmin
    .from("Booking")
    .select("id")
    .eq("roomId", roomId)
    .neq("id", id)
    .in("status", ["ACCEPTED", "COMPLETED"])
    .lt("checkIn", checkOutIso)
    .gt("checkOut", checkInIso)
    .maybeSingle();
  if (conflictInt) {
    return NextResponse.json({ error: "Room already has another confirmed booking for these dates" }, { status: 409 });
  }

  await supabaseAdmin.from("Booking").update({ roomId, updatedAt: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ success: true, bookingId: id, roomId });
}

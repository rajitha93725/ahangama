import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params;
  const { searchParams } = req.nextUrl;
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");

  if (!checkIn || !checkOut) {
    return NextResponse.json({ error: "checkIn and checkOut are required" }, { status: 400 });
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  const checkInIso = checkInDate.toISOString();
  const checkOutIso = checkOutDate.toISOString();

  const [{ data: rooms }, { data: roomTypes }] = await Promise.all([
    supabaseAdmin
      .from("Room")
      .select("id, name, maxGuests, roomTypeId")
      .eq("propertyId", propertyId)
      .eq("isActive", true)
      .order("createdAt"),
    supabaseAdmin
      .from("RoomType")
      .select("id, typeName, displayLabel, roomCount, beds, maxGuests, bathrooms, amenities, pricePerNight, priceBnB, priceHalfBoard, priceFullBoard")
      .eq("propertyId", propertyId)
      .order("createdAt"),
  ]);

  if (!rooms?.length) {
    return NextResponse.json({ availableCount: 0, totalRooms: 0, roomNames: [], roomTypes: null });
  }

  const allRoomIds = rooms.map((r: { id: string }) => r.id);

  // Replace UNION query with two parallel queries then merge
  const [{ data: extBusy }, { data: intBusy }] = await Promise.all([
    supabaseAdmin
      .from("ExternalBooking")
      .select("roomId")
      .in("roomId", allRoomIds)
      .eq("status", "BOOKED")
      .lt("checkIn", checkOutIso)
      .gt("checkOut", checkInIso),
    supabaseAdmin
      .from("Booking")
      .select("roomId")
      .in("roomId", allRoomIds)
      .in("status", ["ACCEPTED", "COMPLETED"])
      .lt("checkIn", checkOutIso)
      .gt("checkOut", checkInIso),
  ]);

  const busySet = new Set([
    ...(extBusy || []).map((r: { roomId: string }) => r.roomId),
    ...(intBusy || []).filter((r: { roomId: string | null }) => r.roomId).map((r: { roomId: string }) => r.roomId),
  ]);

  let availableCount = 0;
  const roomNames: string[] = [];
  const availableByTypeId: Record<string, number> = {};

  for (const room of rooms as { id: string; name: string; maxGuests: number; roomTypeId: string | null }[]) {
    if (busySet.has(room.id)) continue;
    availableCount++;
    roomNames.push(room.name);
    if (room.roomTypeId) {
      availableByTypeId[room.roomTypeId] = (availableByTypeId[room.roomTypeId] ?? 0) + 1;
    }
  }

  const enrichedRoomTypes = roomTypes?.length
    ? (roomTypes as { id: string; typeName: string; displayLabel: string; roomCount: number; beds: number; maxGuests: number; bathrooms: number; amenities: string; pricePerNight: number; priceBnB: number | null; priceHalfBoard: number | null; priceFullBoard: number | null }[]).map((rt) => ({
        typeId: rt.id,
        typeName: rt.typeName,
        displayLabel: rt.displayLabel,
        total: rt.roomCount,
        available: availableByTypeId[rt.id] ?? 0,
        beds: rt.beds,
        maxGuests: rt.maxGuests,
        bathrooms: rt.bathrooms,
        amenities: (() => { try { return JSON.parse(rt.amenities); } catch { return []; } })(),
        pricePerNight: rt.pricePerNight,
        priceBnB: rt.priceBnB,
        priceHalfBoard: rt.priceHalfBoard,
        priceFullBoard: rt.priceFullBoard,
      }))
    : null;

  return NextResponse.json({ availableCount, totalRooms: rooms.length, roomNames, roomTypes: enrichedRoomTypes });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/properties/[id]/available-rooms?checkIn=...&checkOut=...
// Returns how many rooms are free for the given date range.
// Used by the booking widget to cap the "number of rooms" dropdown.
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

  // Get all active rooms for this property
  const rooms = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
    `SELECT id, name FROM "Room" WHERE propertyId = ? AND isActive = 1 ORDER BY ROWID ASC`,
    propertyId
  );

  if (rooms.length === 0) {
    return NextResponse.json({ availableCount: 0 });
  }

  // For each room, check if it has any conflicting booking
  let availableCount = 0;
  for (const room of rooms) {
    const extConflict = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "ExternalBooking"
       WHERE roomId = ? AND status = 'BOOKED'
         AND checkIn < ? AND checkOut > ?`,
      room.id, checkOutIso, checkInIso
    );
    if (extConflict.length > 0) continue;

    const intConflict = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "Booking"
       WHERE roomId = ? AND status IN ('ACCEPTED', 'COMPLETED')
         AND checkIn < strftime('%s', ?) * 1000
         AND checkOut > strftime('%s', ?) * 1000`,
      room.id, checkOutIso, checkInIso
    );
    if (intConflict.length > 0) continue;

    availableCount++;
  }

  return NextResponse.json({ availableCount, totalRooms: rooms.length });
}

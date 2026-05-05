import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/properties/[id]/available-rooms?checkIn=...&checkOut=...
// Returns available room count overall, plus per-room-type breakdown if the property has types.
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
  const rooms = await prisma.$queryRawUnsafe<{ id: string; name: string; maxGuests: number; roomTypeId: string | null }[]>(
    `SELECT id, name, "maxGuests", "roomTypeId" FROM "Room" WHERE "propertyId" = $1 AND "isActive" = true ORDER BY "createdAt" ASC`,
    propertyId
  );

  if (rooms.length === 0) {
    return NextResponse.json({ availableCount: 0, totalRooms: 0, roomNames: [], roomTypes: null });
  }

  // Check availability for each room
  let availableCount = 0;
  const roomNames: string[] = [];
  const availableByTypeId: Record<string, number> = {};

  for (const room of rooms) {
    const extConflict = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "ExternalBooking"
       WHERE "roomId" = $1 AND status = 'BOOKED'
         AND "checkIn" < $2::timestamptz AND "checkOut" > $3::timestamptz`,
      room.id, checkOutIso, checkInIso
    );
    if (extConflict.length > 0) continue;

    const intConflict = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "Booking"
       WHERE "roomId" = $1 AND status IN ('ACCEPTED', 'COMPLETED')
         AND "checkIn" < $2::timestamptz AND "checkOut" > $3::timestamptz`,
      room.id, checkOutIso, checkInIso
    );
    if (intConflict.length > 0) continue;

    availableCount++;
    roomNames.push(room.name);
    if (room.roomTypeId) {
      availableByTypeId[room.roomTypeId] = (availableByTypeId[room.roomTypeId] ?? 0) + 1;
    }
  }

  // Fetch room types (if any) and enrich with availability
  const roomTypeRows = await prisma.$queryRawUnsafe<{
    id: string; typeName: string; displayLabel: string;
    roomCount: number; beds: number; maxGuests: number; bathrooms: number;
    amenities: string;
    pricePerNight: number; priceBnB: number | null;
    priceHalfBoard: number | null; priceFullBoard: number | null;
  }[]>(
    `SELECT id, "typeName", "displayLabel", "roomCount", beds, "maxGuests", bathrooms, amenities,
            "pricePerNight", "priceBnB", "priceHalfBoard", "priceFullBoard"
     FROM "RoomType" WHERE "propertyId" = $1 ORDER BY "createdAt" ASC`,
    propertyId
  );

  const roomTypes = roomTypeRows.length > 0
    ? roomTypeRows.map((rt) => ({
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

  return NextResponse.json({
    availableCount,
    totalRooms: rooms.length,
    roomNames,
    roomTypes,
  });
}

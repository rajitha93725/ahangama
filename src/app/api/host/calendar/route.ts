import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface UnassignedBookingEntry {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  guests: number;
}

export interface RoomCalendarEntry {
  id: string;
  name: string;
  maxGuests: number;
  status: "AVAILABLE" | "INTERNAL" | "EXTERNAL";
  internalBooking: {
    id: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    status: string;
  } | null;
  externalBooking: {
    id: string;
    source: string;
    guestName: string | null;
    notes: string | null;
    checkIn: string;
    checkOut: string;
  } | null;
}

export interface PropertyCalendarEntry {
  id: string;
  title: string;
  district: string;
  rooms: RoomCalendarEntry[];
  unassignedBookings: UnassignedBookingEntry[];
  totalRooms: number;
  bookedInternal: number;
  bookedExternal: number;
  available: number;
  totalUnassigned: number;
}

// GET /api/host/calendar?date=YYYY-MM-DD&propertyId=...&source=...
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const propertyIdFilter = searchParams.get("propertyId");
  const sourceFilter = searchParams.get("source");

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
  const dayStartIso = dayStart.toISOString();
  const dayEndIso = dayEnd.toISOString();

  // 1. Fetch host's properties
  const properties = await prisma.property.findMany({
    where: {
      hostId: session.user.id,
      status: { in: ["ACTIVE", "INACTIVE", "DRAFT"] },
      ...(propertyIdFilter ? { id: propertyIdFilter } : {}),
    },
    select: { id: true, title: true, district: true },
    orderBy: { title: "asc" },
  });

  if (!properties.length) {
    return NextResponse.json({
      date: dateStr,
      properties: [],
      summary: { totalRooms: 0, bookedInternal: 0, bookedExternal: 0, available: 0, totalUnassigned: 0 },
    });
  }

  const propertyIds = properties.map((p) => p.id);
  const propPlaceholders = propertyIds.map(() => "?").join(",");

  // 2. Unassigned confirmed Ahangama bookings (no roomId) active on this day
  //    These are bookings confirmed in the Ahangama system but not yet linked to a specific room
  const unassignedRows = await prisma.$queryRawUnsafe<
    { id: string; propertyId: string; guestName: string; checkIn: string; checkOut: string; status: string; guests: number }[]
  >(
    `SELECT b.id, b.propertyId, u.name as guestName,
            strftime('%Y-%m-%dT%H:%M:%SZ', b.checkIn / 1000, 'unixepoch') as checkIn,
            strftime('%Y-%m-%dT%H:%M:%SZ', b.checkOut / 1000, 'unixepoch') as checkOut,
            b.status, b.guests
     FROM "Booking" b
     INNER JOIN "User" u ON u.id = b.guestId
     WHERE b.roomId IS NULL
       AND b.propertyId IN (${propPlaceholders})
       AND b.status IN ('ACCEPTED', 'COMPLETED')
       AND b.checkIn <= strftime('%s', ?) * 1000
       AND b.checkOut > strftime('%s', ?) * 1000
     ORDER BY b.checkIn ASC`,
    ...propertyIds,
    dayEndIso,
    dayStartIso
  );

  // 3. Fetch all active rooms for these properties
  const allRooms = await prisma.$queryRawUnsafe<
    { id: string; propertyId: string; name: string; maxGuests: number }[]
  >(
    `SELECT id, propertyId, name, maxGuests FROM "Room"
     WHERE propertyId IN (${propPlaceholders}) AND isActive = 1
     ORDER BY propertyId, ROWID ASC`,
    ...propertyIds
  );

  // Build room-level data only if there are rooms
  let internalByRoom = new Map<string, { id: string; roomId: string; guestName: string; checkIn: string; checkOut: string; status: string }>();
  let externalByRoom = new Map<string, { id: string; roomId: string; source: string; guestName: string | null; notes: string | null; checkIn: string; checkOut: string }>();

  if (allRooms.length) {
    const roomIds = allRooms.map((r) => r.id);
    const roomPlaceholders = roomIds.map(() => "?").join(",");

    // 4. Room-assigned internal bookings active on this day
    const internalBookings = await prisma.$queryRawUnsafe<
      { id: string; roomId: string; guestName: string; checkIn: string; checkOut: string; status: string }[]
    >(
      `SELECT b.id, b.roomId, u.name as guestName,
              strftime('%Y-%m-%dT%H:%M:%SZ', b.checkIn / 1000, 'unixepoch') as checkIn,
              strftime('%Y-%m-%dT%H:%M:%SZ', b.checkOut / 1000, 'unixepoch') as checkOut,
              b.status
       FROM "Booking" b
       INNER JOIN "User" u ON u.id = b.guestId
       WHERE b.roomId IN (${roomPlaceholders})
         AND b.status IN ('ACCEPTED', 'COMPLETED')
         AND b.checkIn <= strftime('%s', ?) * 1000
         AND b.checkOut > strftime('%s', ?) * 1000`,
      ...roomIds,
      dayEndIso,
      dayStartIso
    );

    // 5. External bookings active on this day
    let extSql = `SELECT id, roomId, source, guestName, notes, checkIn, checkOut
       FROM "ExternalBooking"
       WHERE roomId IN (${roomPlaceholders})
         AND status = 'BOOKED'
         AND checkIn <= ?
         AND checkOut > ?`;
    const extParams: unknown[] = [...roomIds, dayEndIso, dayStartIso];
    if (sourceFilter) {
      extSql += ` AND source = ?`;
      extParams.push(sourceFilter);
    }

    const externalBookings = await prisma.$queryRawUnsafe<
      { id: string; roomId: string; source: string; guestName: string | null; notes: string | null; checkIn: string; checkOut: string }[]
    >(extSql, ...extParams);

    internalByRoom = new Map(internalBookings.map((b) => [b.roomId, b]));
    externalByRoom = new Map(externalBookings.map((b) => [b.roomId, b]));
  }

  // Group unassigned by property
  const unassignedByProperty = new Map<string, UnassignedBookingEntry[]>();
  for (const row of unassignedRows) {
    if (!unassignedByProperty.has(row.propertyId)) unassignedByProperty.set(row.propertyId, []);
    unassignedByProperty.get(row.propertyId)!.push({
      id: row.id,
      guestName: row.guestName,
      checkIn: row.checkIn,
      checkOut: row.checkOut,
      status: row.status,
      guests: row.guests,
    });
  }

  // 6. Assemble per-property calendar entries
  let totalRooms = 0;
  let totalInternal = 0;
  let totalExternal = 0;
  let totalAvailable = 0;
  let totalUnassigned = 0;

  const result: PropertyCalendarEntry[] = properties.map((property) => {
    const rooms = allRooms.filter((r) => r.propertyId === property.id);
    const unassigned = unassignedByProperty.get(property.id) ?? [];

    const roomEntries: RoomCalendarEntry[] = rooms.map((room) => {
      const intBooking = internalByRoom.get(room.id) ?? null;
      const extBooking = externalByRoom.get(room.id) ?? null;

      // ExternalBookings created by autoAssignRoom for multi-room Ahangama bookings
      // use source='AHANGAMA'. Treat them as internal so they render green in the calendar.
      const isAhangamaOverflow = extBooking?.source === "AHANGAMA";
      const effectiveIntBooking = intBooking ?? (isAhangamaOverflow ? {
        id: extBooking!.id,
        roomId: extBooking!.roomId,
        guestName: extBooking!.guestName ?? "Ahangama booking",
        checkIn: extBooking!.checkIn,
        checkOut: extBooking!.checkOut,
        status: "ACCEPTED",
      } : null);
      const effectiveExtBooking = isAhangamaOverflow ? null : extBooking;

      let status: RoomCalendarEntry["status"] = "AVAILABLE";
      if (effectiveIntBooking) status = "INTERNAL";
      else if (effectiveExtBooking) status = "EXTERNAL";

      return {
        id: room.id,
        name: room.name,
        maxGuests: room.maxGuests,
        status,
        internalBooking: effectiveIntBooking
          ? { id: effectiveIntBooking.id, guestName: effectiveIntBooking.guestName, checkIn: effectiveIntBooking.checkIn, checkOut: effectiveIntBooking.checkOut, status: effectiveIntBooking.status }
          : null,
        externalBooking: effectiveExtBooking
          ? { id: effectiveExtBooking.id, source: effectiveExtBooking.source, guestName: effectiveExtBooking.guestName, notes: effectiveExtBooking.notes, checkIn: effectiveExtBooking.checkIn, checkOut: effectiveExtBooking.checkOut }
          : null,
      };
    });

    const bookedInternal = roomEntries.filter((r) => r.status === "INTERNAL").length;
    const bookedExternal = roomEntries.filter((r) => r.status === "EXTERNAL").length;
    const available = roomEntries.filter((r) => r.status === "AVAILABLE").length;

    totalRooms += rooms.length;
    totalInternal += bookedInternal;
    totalExternal += bookedExternal;
    totalAvailable += available;
    totalUnassigned += unassigned.length;

    return {
      ...property,
      rooms: roomEntries,
      unassignedBookings: unassigned,
      totalRooms: rooms.length,
      bookedInternal,
      bookedExternal,
      available,
      totalUnassigned: unassigned.length,
    };
  });

  return NextResponse.json({
    date: dateStr,
    properties: result,
    summary: {
      totalRooms,
      bookedInternal: totalInternal,
      bookedExternal: totalExternal,
      available: totalAvailable,
      totalUnassigned,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/host/bookings/[id]/assign-room
// Body: { roomId: string }
// Assigns an internal Ahangama booking to a specific room, with double-booking check.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { roomId } = body;

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  // Verify the booking belongs to this host and is confirmed
  const bookingRows = await prisma.$queryRawUnsafe<
    { id: string; propertyId: string; checkIn: string; checkOut: string; status: string }[]
  >(
    `SELECT b.id, b."propertyId",
            to_char(b."checkIn" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "checkIn",
            to_char(b."checkOut" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "checkOut",
            b.status
     FROM "Booking" b
     INNER JOIN "Property" p ON p.id = b."propertyId"
     WHERE b.id = $1 AND p."hostId" = $2 AND b.status IN ('ACCEPTED', 'COMPLETED')`,
    id,
    session.user.id
  );
  if (!bookingRows.length) {
    return NextResponse.json({ error: "Booking not found or not yet confirmed" }, { status: 404 });
  }
  const booking = bookingRows[0];

  // Verify the room belongs to this host's property and is active
  const roomRows = await prisma.$queryRawUnsafe<{ id: string; propertyId: string }[]>(
    `SELECT r.id, r."propertyId" FROM "Room" r
     INNER JOIN "Property" p ON p.id = r."propertyId"
     WHERE r.id = $1 AND p."hostId" = $2 AND r."isActive" = true`,
    roomId,
    session.user.id
  );
  if (!roomRows.length) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (roomRows[0].propertyId !== booking.propertyId) {
    return NextResponse.json({ error: "Room does not belong to the same property as this booking" }, { status: 400 });
  }

  const checkInIso = booking.checkIn;
  const checkOutIso = booking.checkOut;

  // Double-booking check: external bookings overlapping the full stay
  const conflictExt = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "ExternalBooking"
     WHERE "roomId" = $1 AND status = 'BOOKED'
       AND "checkIn" < $2::timestamptz AND "checkOut" > $3::timestamptz`,
    roomId,
    checkOutIso,
    checkInIso
  );
  if (conflictExt.length) {
    return NextResponse.json({ error: "Room has an external booking that conflicts with these dates" }, { status: 409 });
  }

  // Double-booking check: other internal bookings for this room
  const conflictInt = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Booking"
     WHERE "roomId" = $1 AND id != $2 AND status IN ('ACCEPTED', 'COMPLETED')
       AND "checkIn" < $3::timestamptz AND "checkOut" > $4::timestamptz`,
    roomId,
    id,
    checkOutIso,
    checkInIso
  );
  if (conflictInt.length) {
    return NextResponse.json({ error: "Room already has another confirmed booking for these dates" }, { status: 409 });
  }

  // Assign the room
  await prisma.$executeRaw`UPDATE "Booking" SET roomId = ${roomId} WHERE id = ${id}`;

  return NextResponse.json({ success: true, bookingId: id, roomId });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const VALID_SOURCES = ["BOOKING_COM", "AIRBNB", "AGODA", "WALK_ON", "OTHER"];

// POST /api/host/external-bookings — create an external booking
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

  // Verify the room belongs to this host
  const roomRows = await prisma.$queryRawUnsafe<{ id: string; propertyId: string }[]>(
    `SELECT r.id, r.propertyId FROM "Room" r
     INNER JOIN "Property" p ON p.id = r.propertyId
     WHERE r.id = ? AND p.hostId = ? AND r.isActive = 1`,
    roomId,
    session.user.id
  );
  if (!roomRows.length) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const { propertyId } = roomRows[0];

  const checkInIso = checkInDate.toISOString();
  const checkOutIso = checkOutDate.toISOString();

  // Double-booking check: existing EXTERNAL bookings that overlap
  const conflictExt = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "ExternalBooking"
     WHERE roomId = ? AND status = 'BOOKED'
       AND checkIn < ? AND checkOut > ?`,
    roomId,
    checkOutIso,
    checkInIso
  );
  if (conflictExt.length) {
    return NextResponse.json({ error: "Room already has an external booking for this period" }, { status: 409 });
  }

  // Double-booking check: existing INTERNAL bookings that overlap (for rooms with roomId set)
  const conflictInt = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Booking"
     WHERE roomId = ? AND status IN ('ACCEPTED', 'COMPLETED')
       AND checkIn < strftime('%s', ?) * 1000
       AND checkOut > strftime('%s', ?) * 1000`,
    roomId,
    checkOutIso,
    checkInIso
  );
  if (conflictInt.length) {
    return NextResponse.json({ error: "Room already has an internal booking for this period" }, { status: 409 });
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  await prisma.$executeRaw`
    INSERT INTO "ExternalBooking" (id, propertyId, roomId, checkIn, checkOut, source, guestName, notes, status, createdAt, updatedAt)
    VALUES (${id}, ${propertyId}, ${roomId}, ${checkInIso}, ${checkOutIso}, ${source}, ${guestName ?? null}, ${notes ?? null}, 'BOOKED', ${now}, ${now})
  `;

  const [booking] = await prisma.$queryRawUnsafe<{
    id: string; propertyId: string; roomId: string; checkIn: string; checkOut: string;
    source: string; guestName: string | null; notes: string | null; status: string; createdAt: string;
  }[]>(
    `SELECT * FROM "ExternalBooking" WHERE id = ?`,
    id
  );

  return NextResponse.json(booking, { status: 201 });
}

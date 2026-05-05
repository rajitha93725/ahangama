import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_SOURCES = ["BOOKING_COM", "AIRBNB", "AGODA", "WALK_ON", "OTHER"];

// PUT /api/host/external-bookings/[id] — update an external booking
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const rows = await prisma.$queryRawUnsafe<{ id: string; roomId: string; checkIn: string; checkOut: string }[]>(
    `SELECT eb.id, eb."roomId", eb."checkIn", eb."checkOut" FROM "ExternalBooking" eb
     INNER JOIN "Property" p ON p.id = eb."propertyId"
     WHERE eb.id = $1 AND p."hostId" = $2`,
    id,
    session.user.id
  );
  if (!rows.length) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  const existing = rows[0];

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

  const checkInIso = newCheckIn.toISOString();
  const checkOutIso = newCheckOut.toISOString();

  // Double-booking check (excluding self)
  if (checkIn || checkOut) {
    const conflict = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "ExternalBooking"
       WHERE "roomId" = $1 AND status = 'BOOKED' AND id != $2
         AND "checkIn" < $3::timestamptz AND "checkOut" > $4::timestamptz`,
      existing.roomId,
      id,
      checkOutIso,
      checkInIso
    );
    if (conflict.length) {
      return NextResponse.json({ error: "Room already has another booking for this period" }, { status: 409 });
    }
  }

  const now = new Date().toISOString();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (checkIn) { values.push(checkInIso); updates.push(`"checkIn" = $${values.length}`); }
  if (checkOut) { values.push(checkOutIso); updates.push(`"checkOut" = $${values.length}`); }
  if (source) { values.push(source); updates.push(`source = $${values.length}`); }
  if (guestName !== undefined) { values.push(guestName || null); updates.push(`"guestName" = $${values.length}`); }
  if (notes !== undefined) { values.push(notes || null); updates.push(`notes = $${values.length}`); }

  values.push(now);
  updates.push(`"updatedAt" = $${values.length}`);
  values.push(id);

  await prisma.$queryRawUnsafe(
    `UPDATE "ExternalBooking" SET ${updates.join(", ")} WHERE id = $${values.length}`,
    ...values
  );

  const [booking] = await prisma.$queryRawUnsafe<{
    id: string; propertyId: string; roomId: string; checkIn: string; checkOut: string;
    source: string; guestName: string | null; notes: string | null; status: string;
  }[]>(
    `SELECT * FROM "ExternalBooking" WHERE id = $1`,
    id
  );

  return NextResponse.json(booking);
}

// DELETE /api/host/external-bookings/[id] — remove an external booking
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT eb.id FROM "ExternalBooking" eb
     INNER JOIN "Property" p ON p.id = eb."propertyId"
     WHERE eb.id = $1 AND p."hostId" = $2`,
    id,
    session.user.id
  );
  if (!rows.length) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  await prisma.$executeRaw`DELETE FROM "ExternalBooking" WHERE id = ${id}`;

  return NextResponse.json({ success: true });
}

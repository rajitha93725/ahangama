import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OfferSchema } from "@/lib/validations";
import { randomUUID } from "crypto";

// ─── Auto Room Assignment ─────────────────────────────────────────────────────
// Called when a booking reaches ACCEPTED status.
// 1. Ensures the property has rooms (provisions Room 1…N from bedrooms count if none exist).
// 2. Single bulk query finds all busy room IDs for the date range.
// 3. Assigns up to `roomsRequested` free rooms:
//    - Primary room → set roomId on the Booking row (shows green in calendar).
//    - Extra rooms  → blocked via ExternalBooking rows so the calendar reflects occupancy.
// Non-fatal: errors are logged but never block the booking confirmation.
async function autoAssignRoom(
  bookingId: string,
  propertyId: string,
  checkIn: Date,
  checkOut: Date
) {
  try {
    const checkInIso = checkIn.toISOString();
    const checkOutIso = checkOut.toISOString();

    // 1. Provision rooms if the property currently has none (batch INSERT)
    const countRow = await prisma.$queryRawUnsafe<{ cnt: bigint }[]>(
      `SELECT COUNT(*) as cnt FROM "Room" WHERE "propertyId" = $1 AND "isActive" = true`,
      propertyId
    );
    const existingCount = Number(countRow[0]?.cnt ?? 0);

    if (existingCount === 0) {
      const propRow = await prisma.$queryRawUnsafe<{ bedrooms: number; category: string }[]>(
        `SELECT bedrooms, category FROM "Property" WHERE id = $1`, propertyId
      );
      const isStay = propRow[0]?.category !== "TRANSPORT";
      const bedroomCount = propRow[0]?.bedrooms ?? 0;
      if (isStay && bedroomCount > 0) {
        const bRows: unknown[] = [];
        const bPlaceholders: string[] = [];
        let bp = 1;
        for (let i = 1; i <= bedroomCount; i++) {
          bRows.push(randomUUID(), propertyId, `Room ${i}`);
          bPlaceholders.push(`($${bp++}, $${bp++}, $${bp++}, 2, true, NOW())`);
        }
        await prisma.$queryRawUnsafe(
          `INSERT INTO "Room" (id, "propertyId", name, "maxGuests", "isActive", "createdAt") VALUES ${bPlaceholders.join(", ")}`,
          ...bRows
        );
      }
    }

    // 2. Load booking info: guest name + room selections (typed breakdown)
    const bookingRow = await prisma.$queryRawUnsafe<{
      roomsRequested: number; guestName: string | null; roomSelections: string | null;
    }[]>(
      `SELECT b."roomsRequested", u.name as "guestName", b."roomSelections"
       FROM "Booking" b INNER JOIN "User" u ON u.id = b."guestId"
       WHERE b.id = $1`,
      bookingId
    );
    const requested = Number(bookingRow[0]?.roomsRequested ?? 1);
    const guestName = bookingRow[0]?.guestName ?? "Visit Sri Lanka booking";
    const roomSelectionsJson = bookingRow[0]?.roomSelections;
    const roomSelections: Array<{ typeId: string; count: number }> | null =
      roomSelectionsJson ? (() => { try { return JSON.parse(roomSelectionsJson); } catch { return null; } })() : null;

    // 3. Load all active rooms + find busy ones with a single UNION query
    const allRooms = await prisma.$queryRawUnsafe<{ id: string; roomTypeId: string | null }[]>(
      `SELECT id, "roomTypeId" FROM "Room" WHERE "propertyId" = $1 AND "isActive" = true ORDER BY "createdAt" ASC`,
      propertyId
    );
    if (allRooms.length === 0) return;

    const allRoomIds = allRooms.map((r) => r.id);
    const inClause = allRoomIds.map((_, i) => `$${i + 1}`).join(", ");
    const o = allRoomIds.length; // offset for subsequent params
    const busyRows = await prisma.$queryRawUnsafe<{ roomId: string }[]>(
      `SELECT DISTINCT "roomId" FROM "ExternalBooking"
       WHERE "roomId" IN (${inClause}) AND status = 'BOOKED'
         AND "checkIn" < $${o + 1}::timestamptz AND "checkOut" > $${o + 2}::timestamptz
       UNION
       SELECT DISTINCT "roomId" FROM "Booking"
       WHERE "roomId" IN (${inClause}) AND id != $${o + 3} AND status IN ('ACCEPTED','COMPLETED')
         AND "checkIn" < $${o + 1}::timestamptz AND "checkOut" > $${o + 2}::timestamptz`,
      ...allRoomIds, checkOutIso, checkInIso, bookingId
    );
    const busySet = new Set(busyRows.map((r) => r.roomId));

    // 4a. TYPED assignment — guest specified room types via roomSelections
    if (roomSelections && roomSelections.length > 0) {
      let primaryRoomId: string | null = null;
      const extraRoomIds: string[] = [];

      for (const sel of roomSelections) {
        const typeRooms = allRooms.filter((r) => r.roomTypeId === sel.typeId && !busySet.has(r.id));
        let assigned = 0;
        for (const room of typeRooms) {
          if (assigned >= sel.count) break;
          if (!primaryRoomId) {
            primaryRoomId = room.id;
          } else {
            extraRoomIds.push(room.id);
          }
          assigned++;
        }
      }

      if (!primaryRoomId) return;
      await prisma.$executeRaw`UPDATE "Booking" SET "roomId" = ${primaryRoomId} WHERE id = ${bookingId}`;
      for (const roomId of extraRoomIds) {
        await prisma.$queryRawUnsafe(
          `INSERT INTO "ExternalBooking" (id, "propertyId", "roomId", "checkIn", "checkOut", source, "guestName", notes, status, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4::timestamp, $5::timestamp, 'AHANGAMA', $6, $7, 'BOOKED', NOW(), NOW())`,
          randomUUID(), propertyId, roomId, checkInIso, checkOutIso,
          guestName, `Linked to booking ${bookingId} (multi-room)`
        );
      }
      return;
    }

    // 4b. UNTYPED fallback — assign first N free rooms
    const freeRooms = allRooms.filter((r) => !busySet.has(r.id));
    if (freeRooms.length === 0) return;

    const toAssign = freeRooms.slice(0, requested);
    await prisma.$executeRaw`UPDATE "Booking" SET "roomId" = ${toAssign[0].id} WHERE id = ${bookingId}`;
    for (let i = 1; i < toAssign.length; i++) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "ExternalBooking" (id, "propertyId", "roomId", "checkIn", "checkOut", source, "guestName", notes, status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4::timestamp, $5::timestamp, 'AHANGAMA', $6, $7, 'BOOKED', NOW(), NOW())`,
        randomUUID(), propertyId, toAssign[i].id, checkInIso, checkOutIso,
        guestName, `Linked to booking ${bookingId} (multi-room)`
      );
    }
  } catch (err) {
    console.error("[autoAssignRoom]", err);
  }
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING_OFFER: ["COUNTERED", "ACCEPTED", "REJECTED"],
  COUNTERED: ["PENDING_OFFER", "ACCEPTED", "REJECTED"],
};

function getNewStatus(currentStatus: string, offerType: string): string {
  if (offerType === "ACCEPTANCE") return "ACCEPTED";
  if (offerType === "REJECTION") return "REJECTED";
  if (offerType === "COUNTER_OFFER") return "COUNTERED";
  return "PENDING_OFFER";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { property: { select: { hostId: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner =
    booking.guestId === session.user.id ||
    booking.property.hostId === session.user.id ||
    session.user.role === "ADMIN";
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const offers = await prisma.offer.findMany({
    where: { bookingId: id },
    include: { sender: { select: { id: true, name: true, image: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(offers);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { property: { select: { hostId: true, title: true } } },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isGuest = booking.guestId === session.user.id;
  const isHost = booking.property.hostId === session.user.id;
  if (!isGuest && !isHost) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!["PENDING_OFFER", "COUNTERED"].includes(booking.status)) {
    return NextResponse.json({ error: "Booking is no longer negotiable" }, { status: 400 });
  }

  const body = await req.json();
  const result = OfferSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { amount, message, type } = result.data;
  const newStatus = getNewStatus(booking.status, type);

  if (!VALID_TRANSITIONS[booking.status]?.includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
  }

  // For acceptance: must match the last offer exactly and cannot accept your own offer
  if (type === "ACCEPTANCE") {
    const lastOffer = await prisma.offer.findFirst({
      where: { bookingId: id },
      orderBy: { createdAt: "desc" },
    });
    if (!lastOffer) {
      return NextResponse.json({ error: "No offer to accept" }, { status: 400 });
    }
    if (lastOffer.senderId === session.user.id) {
      return NextResponse.json({ error: "Cannot accept your own offer" }, { status: 403 });
    }
    if (Math.abs(amount - lastOffer.amount) > 0.01) {
      return NextResponse.json({ error: "Acceptance amount must match the current offer" }, { status: 400 });
    }
  }

  // Amount stored is the total (not per-night), so totalPrice = amount directly
  const totalPrice = type === "ACCEPTANCE" ? amount : undefined;

  const [offer] = await prisma.$transaction([
    prisma.offer.create({
      data: { bookingId: id, senderId: session.user.id, amount, message, type },
      include: { sender: { select: { id: true, name: true, image: true, role: true } } },
    }),
    prisma.booking.update({
      where: { id },
      data: { status: newStatus, ...(totalPrice ? { totalPrice } : {}) },
    }),
  ]);

  // Auto-assign a room in the booking calendar when booking is confirmed
  if (type === "ACCEPTANCE") {
    await autoAssignRoom(id, booking.propertyId, booking.checkIn, booking.checkOut);
  }

  // Notify the other party
  const recipientId = isGuest ? booking.property.hostId : booking.guestId;
  const notifType =
    type === "ACCEPTANCE"
      ? "BOOKING_ACCEPTED"
      : type === "REJECTION"
      ? "BOOKING_REJECTED"
      : "COUNTER_OFFER";
  const notifTitle =
    type === "ACCEPTANCE"
      ? "Booking Confirmed!"
      : type === "REJECTION"
      ? "Offer Declined"
      : "Counter Offer Received";
  const notifMessage =
    type === "ACCEPTANCE"
      ? `Your booking for ${booking.property.title} is confirmed at $${amount}/night`
      : type === "REJECTION"
      ? `Your offer for ${booking.property.title} was declined`
      : `Counter offer of $${amount}/night received for ${booking.property.title}`;

  await prisma.notification.create({
    data: {
      userId: recipientId,
      type: notifType,
      title: notifTitle,
      message: notifMessage,
      data: JSON.stringify({ bookingId: id }),
    },
  });

  // Emit socket event (if global io is set)
  const globalAny = global as { io?: { to: (room: string) => { emit: (event: string, data: unknown) => void } } };
  if (globalAny.io) {
    globalAny.io.to(`booking:${id}`).emit("offer:new", {
      id: offer.id,
      bookingId: id,
      senderId: session.user.id,
      senderName: offer.sender.name || "Unknown",
      amount,
      message,
      type,
      createdAt: offer.createdAt.toISOString(),
    });
    globalAny.io.to(`booking:${id}`).emit("booking:status", {
      bookingId: id,
      status: newStatus,
      totalPrice,
    });
    globalAny.io.to(`user:${recipientId}`).emit("notification:new", {
      id: crypto.randomUUID(),
      type: notifType,
      title: notifTitle,
      message: notifMessage,
      data: JSON.stringify({ bookingId: id }),
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json(offer, { status: 201 });
}

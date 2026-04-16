import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OfferSchema } from "@/lib/validations";
import { randomUUID } from "crypto";

// ─── Auto Room Assignment ─────────────────────────────────────────────────────
// Called when a booking reaches ACCEPTED status.
// 1. Ensures the property has rooms (provisions Room 1…N from bedrooms count if none exist).
// 2. Collects free rooms for the stay dates.
// 3. Assigns up to `roomsRequested` free rooms:
//    - Primary room → set roomId on the Booking row (shows green in calendar).
//    - Extra rooms  → blocked via ExternalBooking rows so the calendar reflects occupancy.
// Non-fatal: errors are logged but never block the booking confirmation.
// Helper: check if a room is free for the given date range
async function isRoomFree(roomId: string, bookingId: string, checkInIso: string, checkOutIso: string): Promise<boolean> {
  const extConflict = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "ExternalBooking"
     WHERE roomId = ? AND status = 'BOOKED'
       AND checkIn < ? AND checkOut > ?`,
    roomId, checkOutIso, checkInIso
  );
  if (extConflict.length) return false;

  const intConflict = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Booking"
     WHERE roomId = ? AND id != ? AND status IN ('ACCEPTED', 'COMPLETED')
       AND checkIn < strftime('%s', ?) * 1000
       AND checkOut > strftime('%s', ?) * 1000`,
    roomId, bookingId, checkOutIso, checkInIso
  );
  return intConflict.length === 0;
}

async function autoAssignRoom(
  bookingId: string,
  propertyId: string,
  checkIn: Date,
  checkOut: Date
) {
  try {
    const checkInIso = checkIn.toISOString();
    const checkOutIso = checkOut.toISOString();

    // 1. Provision rooms if the property currently has none (old-style, no room types)
    const countRow = await prisma.$queryRawUnsafe<{ cnt: number }[]>(
      `SELECT COUNT(*) as cnt FROM "Room" WHERE propertyId = ? AND isActive = 1`,
      propertyId
    );
    const existingCount = Number(countRow[0]?.cnt ?? 0);

    if (existingCount === 0) {
      const prop = await prisma.property.findUnique({ where: { id: propertyId }, select: { bedrooms: true } });
      const catRow = await prisma.$queryRawUnsafe<{ category: string }[]>(
        `SELECT category FROM "Property" WHERE id = ?`, propertyId
      );
      const isStay = catRow[0]?.category !== "TRANSPORT";
      if (isStay && prop?.bedrooms && prop.bedrooms > 0) {
        const now = new Date().toISOString();
        for (let i = 1; i <= prop.bedrooms; i++) {
          await prisma.$queryRawUnsafe(
            `INSERT INTO "Room" (id, propertyId, name, maxGuests, isActive, createdAt) VALUES (?, ?, ?, 2, 1, ?)`,
            randomUUID(), propertyId, `Room ${i}`, now
          );
        }
      }
    }

    // 2. Load booking info: guest name + room selections (typed breakdown)
    const bookingRow = await prisma.$queryRawUnsafe<{
      roomsRequested: number; guestName: string | null; roomSelections: string | null;
    }[]>(
      `SELECT b.roomsRequested, u.name as guestName, b.roomSelections
       FROM "Booking" b INNER JOIN "User" u ON u.id = b.guestId
       WHERE b.id = ?`,
      bookingId
    );
    const requested = Number(bookingRow[0]?.roomsRequested ?? 1);
    const guestName = bookingRow[0]?.guestName ?? "Ahangama booking";
    const roomSelectionsJson = bookingRow[0]?.roomSelections;
    const roomSelections: Array<{ typeId: string; count: number }> | null =
      roomSelectionsJson ? (() => { try { return JSON.parse(roomSelectionsJson); } catch { return null; } })() : null;

    const now = new Date().toISOString();

    // 3a. TYPED assignment — guest specified room types via roomSelections
    if (roomSelections && roomSelections.length > 0) {
      const allRooms = await prisma.$queryRawUnsafe<{ id: string; roomTypeId: string | null }[]>(
        `SELECT id, roomTypeId FROM "Room" WHERE propertyId = ? AND isActive = 1 ORDER BY ROWID ASC`,
        propertyId
      );

      let primaryRoomId: string | null = null;
      const extraRoomIds: string[] = [];

      for (const sel of roomSelections) {
        const typeRooms = allRooms.filter((r) => r.roomTypeId === sel.typeId);
        let assigned = 0;
        for (const room of typeRooms) {
          if (assigned >= sel.count) break;
          if (!(await isRoomFree(room.id, bookingId, checkInIso, checkOutIso))) continue;
          if (!primaryRoomId) {
            primaryRoomId = room.id;
          } else {
            extraRoomIds.push(room.id);
          }
          assigned++;
        }
      }

      if (!primaryRoomId) return; // Nothing free
      await prisma.$executeRaw`UPDATE "Booking" SET roomId = ${primaryRoomId} WHERE id = ${bookingId}`;
      for (const roomId of extraRoomIds) {
        await prisma.$queryRawUnsafe(
          `INSERT INTO "ExternalBooking" (id, propertyId, roomId, checkIn, checkOut, source, guestName, notes, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, 'AHANGAMA', ?, ?, 'BOOKED', ?, ?)`,
          randomUUID(), propertyId, roomId, checkInIso, checkOutIso,
          guestName, `Linked to booking ${bookingId} (multi-room)`, now, now
        );
      }
      return;
    }

    // 3b. UNTYPED fallback — assign first N free rooms (old behaviour)
    const rooms = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "Room" WHERE propertyId = ? AND isActive = 1 ORDER BY ROWID ASC`,
      propertyId
    );
    const freeRooms: string[] = [];
    for (const room of rooms) {
      if (await isRoomFree(room.id, bookingId, checkInIso, checkOutIso)) {
        freeRooms.push(room.id);
      }
    }
    if (freeRooms.length === 0) return;

    const toAssign = freeRooms.slice(0, requested);
    await prisma.$executeRaw`UPDATE "Booking" SET roomId = ${toAssign[0]} WHERE id = ${bookingId}`;
    for (let i = 1; i < toAssign.length; i++) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO "ExternalBooking" (id, propertyId, roomId, checkIn, checkOut, source, guestName, notes, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'AHANGAMA', ?, ?, 'BOOKED', ?, ?)`,
        randomUUID(), propertyId, toAssign[i], checkInIso, checkOutIso,
        guestName, `Linked to booking ${bookingId} (multi-room)`, now, now
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

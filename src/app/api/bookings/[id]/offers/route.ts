import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OfferSchema } from "@/lib/validations";

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

  const totalPrice = type === "ACCEPTANCE" ? amount * booking.nights : undefined;

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

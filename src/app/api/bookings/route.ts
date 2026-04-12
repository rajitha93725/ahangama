import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookingRequestSchema } from "@/lib/validations";
import { calcNights } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const role = searchParams.get("role");

  let bookings;
  if (role === "host" || session.user.role === "HOST") {
    bookings = await prisma.booking.findMany({
      where: { property: { hostId: session.user.id } },
      include: {
        guest: { select: { id: true, name: true, image: true, email: true } },
        property: { select: { id: true, title: true, images: { where: { isPrimary: true }, take: 1 } } },
        offers: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
  } else {
    bookings = await prisma.booking.findMany({
      where: { guestId: session.user.id },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            district: true,
            images: { where: { isPrimary: true }, take: 1 },
            host: { select: { id: true, name: true, image: true } },
          },
        },
        offers: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // Enrich bookings with transport fields (stale Prisma client doesn't know them)
  if (bookings.length > 0) {
    const ids = bookings.map((b) => b.id);
    const transportRows = await prisma.$queryRawUnsafe<
      { id: string; pickupPoint: string | null; dropPoint: string | null; distanceKm: number | null }[]
    >(
      `SELECT id, pickupPoint, dropPoint, distanceKm FROM "Booking" WHERE id IN (${ids.map(() => "?").join(",")})`,
      ...ids
    );
    const tMap = Object.fromEntries(transportRows.map((r) => [r.id, r]));
    return NextResponse.json(bookings.map((b) => ({ ...b, ...tMap[b.id] })));
  }

  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const result = BookingRequestSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

    const { propertyId, checkIn, checkOut, guests, roomsRequested, offerAmount, message,
            pickupPoint, dropPoint, distanceKm } = result.data;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = calcNights(checkInDate, checkOutDate);

    if (nights <= 0) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property || property.status !== "ACTIVE") {
      return NextResponse.json({ error: "Property not available" }, { status: 400 });
    }
    if (property.hostId === session.user.id) {
      return NextResponse.json({ error: "Cannot book your own property" }, { status: 400 });
    }

    // For transport: validate required fields
    const catRows = await prisma.$queryRaw<{ category: string; pricePerKm: number | null }[]>`
      SELECT category, pricePerKm FROM "Property" WHERE id = ${propertyId}
    `;
    const isTransport = catRows[0]?.category === "TRANSPORT";
    const pricePerKm = catRows[0]?.pricePerKm ?? 0;

    if (isTransport && (!pickupPoint || !dropPoint)) {
      return NextResponse.json({ error: "Pickup and drop points are required for transport bookings" }, { status: 400 });
    }

    // Notification message differs for transport
    const notifMsg = isTransport
      ? `${session.user.name || "A guest"} sent an offer of $${offerAmount} for ${distanceKm ?? "?"} km trip (${nights} nights parking)`
      : `${session.user.name || "A guest"} sent an offer of $${offerAmount}/night for ${nights} nights`;

    const booking = await prisma.booking.create({
      data: {
        propertyId,
        guestId: session.user.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        nights,
        status: "PENDING_OFFER",
        offers: {
          create: {
            senderId: session.user.id,
            amount: offerAmount,
            message,
            type: "INITIAL_OFFER",
          },
        },
      },
      include: {
        offers: true,
        property: { select: { title: true, hostId: true } },
      },
    });

    // Write columns the stale Prisma client doesn't know about yet
    const finalRoomsRequested = roomsRequested ?? 1;
    await prisma.$executeRaw`UPDATE "Booking" SET roomsRequested = ${finalRoomsRequested} WHERE id = ${booking.id}`;

    if (isTransport && pickupPoint && dropPoint) {
      await prisma.$executeRaw`
        UPDATE "Booking"
        SET pickupPoint = ${pickupPoint},
            dropPoint   = ${dropPoint},
            distanceKm  = ${distanceKm ?? null}
        WHERE id = ${booking.id}
      `;
    }

    await prisma.notification.create({
      data: {
        userId: property.hostId,
        type: "BOOKING_REQUEST",
        title: "New Booking Request",
        message: notifMsg,
        data: JSON.stringify({ bookingId: booking.id }),
      },
    });

    return NextResponse.json(
      { ...booking, pickupPoint: pickupPoint ?? null, dropPoint: dropPoint ?? null, distanceKm: distanceKm ?? null },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/bookings]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

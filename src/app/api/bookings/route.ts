import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { BookingRequestSchema } from "@/lib/validations";
import { calcNights } from "@/lib/utils";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const role = searchParams.get("role");

  if (role === "host" || session.user.role === "HOST") {
    const { data: hostProperties } = await supabaseAdmin.from("Property").select("id").eq("hostId", session.user.id);
    const propertyIds = (hostProperties || []).map((p: { id: string }) => p.id);
    if (!propertyIds.length) return NextResponse.json([]);

    const { data: bookings } = await supabaseAdmin
      .from("Booking")
      .select("id, checkIn, checkOut, guests, status, totalPrice, nights, createdAt, updatedAt, pickupPoint, dropPoint, distanceKm, mealPlan, roomsRequested, roomSelections, guestId, propertyId")
      .in("propertyId", propertyIds)
      .order("updatedAt", { ascending: false });

    if (!bookings?.length) return NextResponse.json([]);

    const guestIds = [...new Set(bookings.map((b: { guestId: string }) => b.guestId))];
    const bPropertyIds = [...new Set(bookings.map((b: { propertyId: string }) => b.propertyId))];
    const bookingIds = bookings.map((b: { id: string }) => b.id);

    const [{ data: guests }, { data: properties }, { data: images }, { data: offers }] = await Promise.all([
      supabaseAdmin.from("User").select("id, name, image, email").in("id", guestIds),
      supabaseAdmin.from("Property").select("id, title").in("id", bPropertyIds),
      supabaseAdmin.from("PropertyImage").select("propertyId, url").in("propertyId", bPropertyIds).eq("isPrimary", true),
      supabaseAdmin.from("Offer").select("bookingId, amount, type, createdAt").in("bookingId", bookingIds).order("createdAt", { ascending: false }),
    ]);

    const guestMap = Object.fromEntries((guests || []).map((g: { id: string; [key: string]: unknown }) => [g.id, g]));
    const propMap = Object.fromEntries((properties || []).map((p: { id: string; title: string }) => [p.id, p]));
    const imageMap = Object.fromEntries((images || []).map((img: { propertyId: string; url: string }) => [img.propertyId, img]));
    const latestOfferMap: Record<string, unknown> = {};
    (offers || []).forEach((o: { bookingId: string; [key: string]: unknown }) => {
      if (!latestOfferMap[o.bookingId]) latestOfferMap[o.bookingId] = o;
    });

    return NextResponse.json(
      (bookings as { id: string; guestId: string; propertyId: string; [key: string]: unknown }[]).map((b) => ({
        ...b,
        guest: guestMap[b.guestId] ?? { id: b.guestId, name: null, image: null, email: null },
        property: { ...(propMap[b.propertyId] ?? { id: b.propertyId, title: null }), images: imageMap[b.propertyId] ? [imageMap[b.propertyId]] : [] },
        offers: latestOfferMap[b.id] ? [latestOfferMap[b.id]] : [],
      }))
    );
  }

  const { data: bookings } = await supabaseAdmin
    .from("Booking")
    .select("id, checkIn, checkOut, guests, status, totalPrice, nights, createdAt, updatedAt, pickupPoint, dropPoint, distanceKm, mealPlan, roomsRequested, roomSelections, propertyId")
    .eq("guestId", session.user.id)
    .order("updatedAt", { ascending: false });

  if (!bookings?.length) return NextResponse.json([]);

  const propertyIds = [...new Set(bookings.map((b: { propertyId: string }) => b.propertyId))];
  const bookingIds = bookings.map((b: { id: string }) => b.id);

  const [{ data: properties }, { data: images }, { data: hosts }, { data: offers }] = await Promise.all([
    supabaseAdmin.from("Property").select("id, title, district, hostId").in("id", propertyIds),
    supabaseAdmin.from("PropertyImage").select("propertyId, url").in("propertyId", propertyIds).eq("isPrimary", true),
    supabaseAdmin.from("Property").select("id, hostId").in("id", propertyIds),
    supabaseAdmin.from("Offer").select("bookingId, amount, type, createdAt").in("bookingId", bookingIds).order("createdAt", { ascending: false }),
  ]);

  const propMap = Object.fromEntries((properties || []).map((p: { id: string; [key: string]: unknown }) => [p.id, p]));
  const imageMap = Object.fromEntries((images || []).map((img: { propertyId: string; url: string }) => [img.propertyId, img]));
  const hostIds = [...new Set((hosts || []).map((p: { hostId: string }) => p.hostId))];
  const { data: hostUsers } = await supabaseAdmin.from("User").select("id, name, image").in("id", hostIds);
  const hostMap = Object.fromEntries((hostUsers || []).map((h: { id: string; [key: string]: unknown }) => [h.id, h]));
  const propHostMap = Object.fromEntries((hosts || []).map((p: { id: string; hostId: string }) => [p.id, hostMap[p.hostId]]));
  const latestOfferMap: Record<string, unknown> = {};
  (offers || []).forEach((o: { bookingId: string; [key: string]: unknown }) => {
    if (!latestOfferMap[o.bookingId]) latestOfferMap[o.bookingId] = o;
  });

  return NextResponse.json(
    (bookings as { id: string; propertyId: string; [key: string]: unknown }[]).map((b) => ({
      ...b,
      property: {
        ...(propMap[b.propertyId] ?? { id: b.propertyId, title: null, district: null }),
        images: imageMap[b.propertyId] ? [imageMap[b.propertyId]] : [],
        host: propHostMap[b.propertyId] ?? null,
      },
      offers: latestOfferMap[b.id] ? [latestOfferMap[b.id]] : [],
    }))
  );
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
    const rawMealPlan = (body.mealPlan as string | undefined) ?? "ROOM_ONLY";
    const vehicleType = (body.vehicleType as string | undefined) ?? "";
    const roomSelections = body.roomSelections as Array<{ typeId: string; typeName: string; displayLabel: string; count: number }> | undefined;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = calcNights(checkInDate, checkOutDate);

    const { data: property } = await supabaseAdmin
      .from("Property")
      .select("id, status, hostId, category, pricePerKm")
      .eq("id", propertyId)
      .maybeSingle();
    if (!property || property.status !== "ACTIVE") {
      return NextResponse.json({ error: "Property not available" }, { status: 400 });
    }
    if (property.hostId === session.user.id) {
      return NextResponse.json({ error: "Cannot book your own property" }, { status: 400 });
    }

    const isTransport = property.category === "TRANSPORT";
    const isRental = property.category === "BIKE_RENTAL" || property.category === "SURF_RENTAL";
    const isInventory = isTransport || isRental;

    if (nights < 0 || (nights === 0 && !isInventory)) {
      return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
    }
    if (isTransport && (!pickupPoint || !dropPoint)) {
      return NextResponse.json({ error: "Pickup and drop points are required for transport bookings" }, { status: 400 });
    }

    const parkingNote = nights > 0 ? ` (${nights} night${nights !== 1 ? "s" : ""} parking)` : "";
    const notifMsg = isTransport
      ? `${session.user.name || "A guest"} sent an offer of $${offerAmount} for ${distanceKm ?? "?"} km trip${parkingNote}`
      : isRental
      ? `${session.user.name || "A guest"} sent an offer of $${offerAmount}/day for ${nights} day${nights !== 1 ? "s" : ""}`
      : `${session.user.name || "A guest"} sent an offer of $${offerAmount}/night for ${nights} nights`;

    const finalMealPlan = isInventory ? "ROOM_ONLY" : rawMealPlan;
    const finalRoomSelections = roomSelections?.length ? JSON.stringify(roomSelections) : null;

    const { data: booking } = await supabaseAdmin
      .from("Booking")
      .insert({
        id: randomUUID(),
        propertyId,
        guestId: session.user.id,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        guests, nights,
        status: "PENDING_OFFER",
        roomsRequested: roomsRequested ?? 1,
        mealPlan: finalMealPlan,
        roomSelections: finalRoomSelections,
        ...(isTransport && pickupPoint && dropPoint ? { pickupPoint, dropPoint, distanceKm: distanceKm ?? null } : {}),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    await supabaseAdmin.from("Offer").insert({
      id: randomUUID(),
      bookingId: booking.id,
      senderId: session.user.id,
      amount: offerAmount,
      message,
      type: "INITIAL_OFFER",
    });

    if (isInventory && vehicleType) {
      const { data: vehicleRooms } = await supabaseAdmin
        .from("Room")
        .select("id")
        .eq("propertyId", propertyId)
        .eq("isActive", true)
        .ilike("name", `${vehicleType} %`);

      if (vehicleRooms?.length) {
        const vehicleRoomIds = vehicleRooms.map((r: { id: string }) => r.id);
        const { data: busyRooms } = await supabaseAdmin
          .from("Booking")
          .select("roomId")
          .in("roomId", vehicleRoomIds)
          .in("status", ["ACCEPTED", "COMPLETED"])
          .lt("checkIn", checkOutDate.toISOString())
          .gt("checkOut", checkInDate.toISOString());
        const busyIds = new Set((busyRooms || []).map((r: { roomId: string }) => r.roomId));
        const freeRoom = vehicleRooms.find((r: { id: string }) => !busyIds.has(r.id));
        if (freeRoom) {
          await supabaseAdmin.from("Booking").update({ roomId: freeRoom.id, updatedAt: new Date().toISOString() }).eq("id", booking.id);
        }
      }
    }

    await supabaseAdmin.from("Notification").insert({
      id: randomUUID(),
      userId: property.hostId,
      type: "BOOKING_REQUEST",
      title: "New Booking Request",
      message: notifMsg,
      data: JSON.stringify({ bookingId: booking.id }),
    });

    const { data: offers } = await supabaseAdmin.from("Offer").select("*").eq("bookingId", booking.id);

    return NextResponse.json(
      { ...booking, offers: offers || [], pickupPoint: pickupPoint ?? null, dropPoint: dropPoint ?? null, distanceKm: distanceKm ?? null },
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

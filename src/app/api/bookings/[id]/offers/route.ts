import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { OfferSchema } from "@/lib/validations";
import { randomUUID } from "crypto";

async function autoAssignRoom(
  bookingId: string,
  propertyId: string,
  checkIn: Date,
  checkOut: Date
) {
  try {
    const checkInIso = checkIn.toISOString();
    const checkOutIso = checkOut.toISOString();

    const { count: existingCount } = await supabaseAdmin
      .from("Room")
      .select("*", { count: "exact", head: true })
      .eq("propertyId", propertyId)
      .eq("isActive", true);

    if (!existingCount) {
      const { data: prop } = await supabaseAdmin
        .from("Property")
        .select("bedrooms, category")
        .eq("id", propertyId)
        .single();
      const isStay = prop?.category !== "TRANSPORT";
      const bedroomCount = prop?.bedrooms ?? 0;
      if (isStay && bedroomCount > 0) {
        await supabaseAdmin.from("Room").insert(
          Array.from({ length: bedroomCount }, (_, i) => ({
            id: randomUUID(), propertyId, name: `Room ${i + 1}`, maxGuests: 2, isActive: true,
          }))
        );
      }
    }

    const { data: bookingRow } = await supabaseAdmin
      .from("Booking")
      .select("roomsRequested, roomSelections, guestId")
      .eq("id", bookingId)
      .single();

    const requested = bookingRow?.roomsRequested ?? 1;
    const { data: guestUser } = await supabaseAdmin.from("User").select("name").eq("id", bookingRow?.guestId).single();
    const guestName = guestUser?.name ?? "Visit Sri Lanka booking";
    const roomSelectionsJson = bookingRow?.roomSelections;
    const roomSelections: Array<{ typeId: string; count: number }> | null =
      roomSelectionsJson ? (() => { try { return JSON.parse(roomSelectionsJson as string); } catch { return null; } })() : null;

    const { data: allRooms } = await supabaseAdmin
      .from("Room")
      .select("id, roomTypeId")
      .eq("propertyId", propertyId)
      .eq("isActive", true)
      .order("createdAt");

    if (!allRooms?.length) return;

    const allRoomIds = allRooms.map((r: { id: string }) => r.id);

    // Replace UNION with two parallel queries
    const [{ data: extBusy }, { data: intBusy }] = await Promise.all([
      supabaseAdmin
        .from("ExternalBooking")
        .select("roomId")
        .in("roomId", allRoomIds)
        .eq("status", "BOOKED")
        .lt("checkIn", checkOutIso)
        .gt("checkOut", checkInIso),
      supabaseAdmin
        .from("Booking")
        .select("roomId")
        .in("roomId", allRoomIds)
        .neq("id", bookingId)
        .in("status", ["ACCEPTED", "COMPLETED"])
        .lt("checkIn", checkOutIso)
        .gt("checkOut", checkInIso),
    ]);

    const busySet = new Set([
      ...(extBusy || []).map((r: { roomId: string }) => r.roomId),
      ...(intBusy || []).filter((r: { roomId: string | null }) => r.roomId).map((r: { roomId: string }) => r.roomId),
    ]);

    if (roomSelections && roomSelections.length > 0) {
      let primaryRoomId: string | null = null;
      const extraRoomIds: string[] = [];

      for (const sel of roomSelections) {
        const typeRooms = (allRooms as { id: string; roomTypeId: string | null }[]).filter(
          (r) => r.roomTypeId === sel.typeId && !busySet.has(r.id)
        );
        let assigned = 0;
        for (const room of typeRooms) {
          if (assigned >= sel.count) break;
          if (!primaryRoomId) primaryRoomId = room.id;
          else extraRoomIds.push(room.id);
          assigned++;
        }
      }

      if (!primaryRoomId) return;
      await supabaseAdmin.from("Booking").update({ roomId: primaryRoomId, updatedAt: new Date().toISOString() }).eq("id", bookingId);
      if (extraRoomIds.length > 0) {
        await supabaseAdmin.from("ExternalBooking").insert(
          extraRoomIds.map((roomId) => ({
            id: randomUUID(), propertyId, roomId,
            checkIn: checkInIso, checkOut: checkOutIso,
            source: "AHANGAMA", guestName,
            notes: `Linked to booking ${bookingId} (multi-room)`,
            status: "BOOKED",
            updatedAt: new Date().toISOString(),
          }))
        );
      }
      return;
    }

    const freeRooms = (allRooms as { id: string; roomTypeId: string | null }[]).filter((r) => !busySet.has(r.id));
    if (!freeRooms.length) return;

    const toAssign = freeRooms.slice(0, requested);
    await supabaseAdmin.from("Booking").update({ roomId: toAssign[0].id, updatedAt: new Date().toISOString() }).eq("id", bookingId);
    if (toAssign.length > 1) {
      await supabaseAdmin.from("ExternalBooking").insert(
        toAssign.slice(1).map((room) => ({
          id: randomUUID(), propertyId, roomId: room.id,
          checkIn: checkInIso, checkOut: checkOutIso,
          source: "OTHER", guestName,
          notes: `Linked to booking ${bookingId} (multi-room)`,
          status: "BOOKED",
          updatedAt: new Date().toISOString(),
        }))
      );
    }
  } catch (err) {
    console.error("[autoAssignRoom]", err);
  }
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING_OFFER: ["COUNTERED", "ACCEPTED", "REJECTED"],
  COUNTERED: ["COUNTERED", "ACCEPTED", "REJECTED"],
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
  const { data: booking } = await supabaseAdmin.from("Booking").select("guestId, propertyId").eq("id", id).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: property } = await supabaseAdmin.from("Property").select("hostId").eq("id", booking.propertyId).single();
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isOwner =
    booking.guestId === session.user.id ||
    property.hostId === session.user.id ||
    session.user.role === "ADMIN";
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: offers } = await supabaseAdmin
    .from("Offer")
    .select("*")
    .eq("bookingId", id)
    .order("createdAt");

  if (!offers?.length) return NextResponse.json([]);

  const senderIds = [...new Set(offers.map((o: { senderId: string }) => o.senderId))];
  const { data: senders } = await supabaseAdmin.from("User").select("id, name, image, role").in("id", senderIds);
  const senderMap = Object.fromEntries((senders || []).map((s: { id: string; [key: string]: unknown }) => [s.id, s]));

  return NextResponse.json(
    offers.map((o: { senderId: string; [key: string]: unknown }) => ({
      ...o,
      sender: senderMap[o.senderId] ?? { id: o.senderId, name: null, image: null, role: null },
    }))
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: booking } = await supabaseAdmin.from("Booking").select("*").eq("id", id).maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: property } = await supabaseAdmin.from("Property").select("hostId, title").eq("id", booking.propertyId).single();
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isGuest = booking.guestId === session.user.id;
  const isHost = property.hostId === session.user.id;
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

  if (type === "ACCEPTANCE") {
    const { data: lastOffer } = await supabaseAdmin
      .from("Offer")
      .select("*")
      .eq("bookingId", id)
      .order("createdAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lastOffer) return NextResponse.json({ error: "No offer to accept" }, { status: 400 });
    if (lastOffer.senderId === session.user.id) return NextResponse.json({ error: "Cannot accept your own offer" }, { status: 403 });
    if (Math.abs(amount - lastOffer.amount) > 0.01) return NextResponse.json({ error: "Acceptance amount must match the current offer" }, { status: 400 });
  }

  const totalPrice = type === "ACCEPTANCE" ? amount : undefined;

  const { data: offer } = await supabaseAdmin
    .from("Offer")
    .insert({ id: randomUUID(), bookingId: id, senderId: session.user.id, amount, message, type })
    .select()
    .single();

  await supabaseAdmin
    .from("Booking")
    .update({ status: newStatus, updatedAt: new Date().toISOString(), ...(totalPrice ? { totalPrice } : {}) })
    .eq("id", id);

  const { data: sender } = await supabaseAdmin.from("User").select("id, name, image, role").eq("id", session.user.id).single();

  if (type === "ACCEPTANCE") {
    await autoAssignRoom(id, booking.propertyId, new Date(booking.checkIn), new Date(booking.checkOut));
  }

  const recipientId = isGuest ? property.hostId : booking.guestId;
  const notifType = type === "ACCEPTANCE" ? "BOOKING_ACCEPTED" : type === "REJECTION" ? "BOOKING_REJECTED" : "COUNTER_OFFER";
  const notifTitle = type === "ACCEPTANCE" ? "Booking Confirmed!" : type === "REJECTION" ? "Offer Declined" : "Counter Offer Received";
  const notifMessage =
    type === "ACCEPTANCE" ? `Your booking for ${property.title} is confirmed at $${amount}/night` :
    type === "REJECTION" ? `Your offer for ${property.title} was declined` :
    `Counter offer of $${amount}/night received for ${property.title}`;

  await supabaseAdmin.from("Notification").insert({
    id: randomUUID(), userId: recipientId, type: notifType, title: notifTitle, message: notifMessage,
    data: JSON.stringify({ bookingId: id }),
  });

  const globalAny = global as { io?: { to: (room: string) => { emit: (event: string, data: unknown) => void } } };
  if (globalAny.io) {
    globalAny.io.to(`booking:${id}`).emit("offer:new", {
      id: offer.id, bookingId: id, senderId: session.user.id,
      senderName: sender?.name || "Unknown", amount, message, type, createdAt: offer.createdAt,
    });
    globalAny.io.to(`booking:${id}`).emit("booking:status", { bookingId: id, status: newStatus, totalPrice });
    globalAny.io.to(`user:${recipientId}`).emit("notification:new", {
      id: crypto.randomUUID(), type: notifType, title: notifTitle, message: notifMessage,
      data: JSON.stringify({ bookingId: id }), createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ...offer, sender }, { status: 201 });
}

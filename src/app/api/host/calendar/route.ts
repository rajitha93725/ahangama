import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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
  isTransport: boolean;
  rooms: RoomCalendarEntry[];
  unassignedBookings: UnassignedBookingEntry[];
  totalRooms: number;
  bookedInternal: number;
  bookedExternal: number;
  available: number;
  totalUnassigned: number;
}

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

  let propertiesQuery = supabaseAdmin
    .from("Property")
    .select("id, title, district, category")
    .eq("hostId", session.user.id)
    .in("status", ["ACTIVE", "INACTIVE", "DRAFT"])
    .order("title");
  if (propertyIdFilter) propertiesQuery = propertiesQuery.eq("id", propertyIdFilter);
  const { data: properties } = await propertiesQuery;

  if (!properties?.length) {
    return NextResponse.json({
      date: dateStr,
      properties: [],
      summary: { totalRooms: 0, bookedInternal: 0, bookedExternal: 0, available: 0, totalUnassigned: 0 },
    });
  }

  const propertyIds = (properties as { id: string }[]).map((p) => p.id);

  const [{ data: unassignedBookings }, { data: allRooms }] = await Promise.all([
    supabaseAdmin
      .from("Booking")
      .select("id, propertyId, checkIn, checkOut, status, guests, guestId")
      .in("propertyId", propertyIds)
      .is("roomId", null)
      .in("status", ["ACCEPTED", "COMPLETED"])
      .lte("checkIn", dayEndIso)
      .gt("checkOut", dayStartIso)
      .order("checkIn"),
    supabaseAdmin
      .from("Room")
      .select("id, propertyId, name, maxGuests")
      .in("propertyId", propertyIds)
      .eq("isActive", true)
      .order("propertyId")
      .order("createdAt"),
  ]);

  const roomIds = (allRooms || []).map((r: { id: string }) => r.id);

  type InternalBookingRaw = { id: string; roomId: string | null; checkIn: string; checkOut: string; status: string; guestId: string };
  type ExternalBookingRaw = { id: string; roomId: string; source: string; guestName: string | null; notes: string | null; checkIn: string; checkOut: string };

  let internalBookingsRaw: InternalBookingRaw[] = [];
  let externalBookingsRaw: ExternalBookingRaw[] = [];

  if (roomIds.length > 0) {
    let externalQuery = supabaseAdmin
      .from("ExternalBooking")
      .select("id, roomId, source, guestName, notes, checkIn, checkOut")
      .in("roomId", roomIds)
      .eq("status", "BOOKED")
      .lte("checkIn", dayEndIso)
      .gt("checkOut", dayStartIso);
    if (sourceFilter) externalQuery = externalQuery.eq("source", sourceFilter);

    const [{ data: internalBookings }, { data: externalBookings }] = await Promise.all([
      supabaseAdmin
        .from("Booking")
        .select("id, roomId, checkIn, checkOut, status, guestId")
        .in("roomId", roomIds)
        .in("status", ["ACCEPTED", "COMPLETED"])
        .lte("checkIn", dayEndIso)
        .gt("checkOut", dayStartIso),
      externalQuery,
    ]);

    internalBookingsRaw = (internalBookings || []) as InternalBookingRaw[];
    externalBookingsRaw = (externalBookings || []) as ExternalBookingRaw[];
  }

  const allGuestIds = [
    ...new Set([
      ...(unassignedBookings || []).map((b: { guestId: string }) => b.guestId),
      ...internalBookingsRaw.map((b) => b.guestId),
    ].filter(Boolean)),
  ] as string[];

  const { data: guestUsers } = allGuestIds.length
    ? await supabaseAdmin.from("User").select("id, name").in("id", allGuestIds)
    : { data: [] };
  const guestMap = Object.fromEntries((guestUsers || []).map((u: { id: string; name: string | null }) => [u.id, u.name]));

  const internalByRoom = new Map<string, { id: string; guestName: string; checkIn: string; checkOut: string; status: string }>();
  const externalByRoom = new Map<string, { id: string; source: string; guestName: string | null; notes: string | null; checkIn: string; checkOut: string }>();

  for (const b of internalBookingsRaw) {
    if (b.roomId) {
      internalByRoom.set(b.roomId, { id: b.id, guestName: guestMap[b.guestId] ?? "Guest", checkIn: b.checkIn, checkOut: b.checkOut, status: b.status });
    }
  }
  for (const b of externalBookingsRaw) {
    externalByRoom.set(b.roomId, { id: b.id, source: b.source, guestName: b.guestName, notes: b.notes, checkIn: b.checkIn, checkOut: b.checkOut });
  }

  const unassignedByProperty = new Map<string, UnassignedBookingEntry[]>();
  for (const b of (unassignedBookings || []) as { id: string; propertyId: string; checkIn: string; checkOut: string; status: string; guests: number; guestId: string }[]) {
    if (!unassignedByProperty.has(b.propertyId)) unassignedByProperty.set(b.propertyId, []);
    unassignedByProperty.get(b.propertyId)!.push({ id: b.id, guestName: guestMap[b.guestId] ?? "Guest", checkIn: b.checkIn, checkOut: b.checkOut, status: b.status, guests: b.guests });
  }

  let totalRooms = 0, totalInternal = 0, totalExternal = 0, totalAvailable = 0, totalUnassigned = 0;

  const result: PropertyCalendarEntry[] = (properties as { id: string; title: string; district: string; category: string }[]).map((property) => {
    const rooms = (allRooms || []).filter((r: { propertyId: string }) => r.propertyId === property.id) as { id: string; name: string; maxGuests: number }[];
    const unassigned = unassignedByProperty.get(property.id) ?? [];

    const roomEntries: RoomCalendarEntry[] = rooms.map((room) => {
      const intBooking = internalByRoom.get(room.id) ?? null;
      const extBooking = externalByRoom.get(room.id) ?? null;

      // Treat as a platform booking if source is AHANGAMA, or if the notes mark it
      // as a multi-room overflow created by autoAssignRoom (source was "OTHER" before fix).
      const isAhangamaOverflow =
        extBooking?.source === "AHANGAMA" ||
        (extBooking?.source === "OTHER" && extBooking.notes?.startsWith("Linked to booking"));
      const effectiveIntBooking = intBooking ?? (isAhangamaOverflow ? {
        id: extBooking!.id,
        guestName: extBooking!.guestName ?? "Visit Sri Lanka booking",
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
        internalBooking: effectiveIntBooking ? { id: effectiveIntBooking.id, guestName: effectiveIntBooking.guestName, checkIn: effectiveIntBooking.checkIn, checkOut: effectiveIntBooking.checkOut, status: effectiveIntBooking.status } : null,
        externalBooking: effectiveExtBooking ? { id: effectiveExtBooking.id, source: effectiveExtBooking.source, guestName: effectiveExtBooking.guestName, notes: effectiveExtBooking.notes, checkIn: effectiveExtBooking.checkIn, checkOut: effectiveExtBooking.checkOut } : null,
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
      id: property.id,
      title: property.title,
      district: property.district,
      isTransport: property.category !== "STAY",
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
    summary: { totalRooms, bookedInternal: totalInternal, bookedExternal: totalExternal, available: totalAvailable, totalUnassigned },
  });
}

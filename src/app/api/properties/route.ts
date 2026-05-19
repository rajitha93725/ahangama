import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { PropertySchema, TransportSchema, RentalSchema } from "@/lib/validations";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const district = searchParams.get("district");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const guests = searchParams.get("guests");
  const propertyType = searchParams.get("propertyType");
  const amenities = searchParams.get("amenities");
  const category = searchParams.get("category");
  const sortBy = searchParams.get("sortBy") || "newest";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");
  const isSortByRating = sortBy === "rating_desc";

  // If amenity filter, find property IDs first
  let amenityPropertyIds: string[] | null = null;
  if (amenities) {
    const amenityList = amenities.split(",");
    const { data: amenityMatches } = await supabaseAdmin
      .from("PropertyAmenity")
      .select("propertyId")
      .in("name", amenityList);
    amenityPropertyIds = [...new Set((amenityMatches || []).map((a: { propertyId: string }) => a.propertyId))];
    if (!amenityPropertyIds.length) {
      return NextResponse.json({ data: [], total: 0, page, totalPages: 0 });
    }
  }

  let countQ = supabaseAdmin.from("Property").select("*", { count: "exact", head: true }).eq("status", "ACTIVE");
  let dataQ = supabaseAdmin
    .from("Property")
    .select("id, title, district, propertyType, category, pricePerNight, pricePerKm, mealPlan, priceBnB, priceHalfBoard, priceFullBoard, maxGuests, bedrooms, hostId")
    .eq("status", "ACTIVE");

  if (district) { countQ = countQ.ilike("district", `%${district}%`); dataQ = dataQ.ilike("district", `%${district}%`); }
  if (minPrice) { countQ = countQ.gte("pricePerNight", parseFloat(minPrice)); dataQ = dataQ.gte("pricePerNight", parseFloat(minPrice)); }
  if (maxPrice) { countQ = countQ.lte("pricePerNight", parseFloat(maxPrice)); dataQ = dataQ.lte("pricePerNight", parseFloat(maxPrice)); }
  if (guests) { countQ = countQ.gte("maxGuests", parseInt(guests)); dataQ = dataQ.gte("maxGuests", parseInt(guests)); }
  if (propertyType) { countQ = countQ.eq("propertyType", propertyType); dataQ = dataQ.eq("propertyType", propertyType); }
  if (category) { countQ = countQ.eq("category", category); dataQ = dataQ.eq("category", category); }
  if (amenityPropertyIds) { countQ = countQ.in("id", amenityPropertyIds); dataQ = dataQ.in("id", amenityPropertyIds); }

  const ascending = sortBy === "price_asc";
  const orderCol = sortBy === "price_asc" || sortBy === "price_desc" ? "pricePerNight" : "createdAt";
  if (!isSortByRating) {
    dataQ = dataQ.order(orderCol, { ascending }).range((page - 1) * limit, page * limit - 1);
  } else {
    dataQ = dataQ.order("createdAt", { ascending: false }).limit(300);
  }

  const [{ count: total }, { data: properties }] = await Promise.all([countQ, dataQ]);
  if (!properties?.length) return NextResponse.json({ data: [], total: total || 0, page, totalPages: Math.ceil((total || 0) / limit) });

  const propIds = properties.map((p: { id: string }) => p.id);
  const hostIds = [...new Set(properties.map((p: { hostId: string }) => p.hostId))];

  const todayStr = new Date().toISOString().split("T")[0];
  const tonightStart = `${todayStr}T00:00:00.000Z`;
  const tonightEnd = `${todayStr}T23:59:59.999Z`;

  const [{ data: images }, { data: hosts }, { data: reviews }, { data: ratings }, { data: allRooms }] = await Promise.all([
    supabaseAdmin.from("PropertyImage").select("propertyId, url, alt").in("propertyId", propIds).eq("isPrimary", true),
    supabaseAdmin.from("User").select("id, name, image").in("id", hostIds),
    supabaseAdmin.from("Review").select("propertyId, rating").in("propertyId", propIds),
    supabaseAdmin.from("PropertyRating").select("propertyId, avgScore, isSeeded").in("propertyId", propIds),
    supabaseAdmin.from("Room").select("id, propertyId").in("propertyId", propIds).eq("isActive", true),
  ]);

  const roomIds = (allRooms || []).map((r: { id: string }) => r.id);
  const [{ data: intBooked }, { data: extBooked }] = roomIds.length
    ? await Promise.all([
        supabaseAdmin.from("Booking").select("roomId").in("roomId", roomIds)
          .in("status", ["ACCEPTED", "COMPLETED"]).lte("checkIn", tonightEnd).gt("checkOut", tonightStart),
        supabaseAdmin.from("ExternalBooking").select("roomId").in("roomId", roomIds)
          .eq("status", "BOOKED").lte("checkIn", tonightEnd).gt("checkOut", tonightStart),
      ])
    : [{ data: [] }, { data: [] }];

  const bookedSet = new Set([
    ...(intBooked || []).filter((r: { roomId: string | null }) => r.roomId).map((r: { roomId: string }) => r.roomId),
    ...(extBooked || []).map((r: { roomId: string }) => r.roomId),
  ]);

  const roomTotalByProp = new Map<string, number>();
  const roomAvailByProp = new Map<string, number>();
  for (const room of (allRooms || []) as { id: string; propertyId: string }[]) {
    roomTotalByProp.set(room.propertyId, (roomTotalByProp.get(room.propertyId) ?? 0) + 1);
    if (!bookedSet.has(room.id)) {
      roomAvailByProp.set(room.propertyId, (roomAvailByProp.get(room.propertyId) ?? 0) + 1);
    }
  }

  const imageMap = Object.fromEntries((images || []).map((img: { propertyId: string; url: string; alt: string | null }) => [img.propertyId, img]));
  const hostMap = Object.fromEntries((hosts || []).map((h: { id: string; [key: string]: unknown }) => [h.id, h]));
  const reviewsByProp: Record<string, number[]> = {};
  (reviews || []).forEach((r: { propertyId: string; rating: number }) => {
    if (!reviewsByProp[r.propertyId]) reviewsByProp[r.propertyId] = [];
    reviewsByProp[r.propertyId].push(r.rating);
  });
  const ratingsByProp: Record<string, number[]> = {};
  (ratings || []).forEach((r: { propertyId: string; avgScore: number }) => {
    if (!ratingsByProp[r.propertyId]) ratingsByProp[r.propertyId] = [];
    ratingsByProp[r.propertyId].push(Number(r.avgScore));
  });

  let data = (properties as { id: string; hostId: string; [key: string]: unknown }[]).map((p) => {
    const pr = ratingsByProp[p.id] || [];
    const rv = reviewsByProp[p.id] || [];
    const propertyRating = pr.length ? parseFloat((pr.reduce((a, b) => a + b, 0) / pr.length).toFixed(1)) : null;
    return {
      ...p,
      images: imageMap[p.id] ? [imageMap[p.id]] : [],
      host: hostMap[p.hostId] ?? { id: p.hostId, name: null, image: null },
      avgRating: rv.length > 0 ? rv.reduce((a, b) => a + b, 0) / rv.length : null,
      reviewCount: rv.length,
      propertyRating,
      propertyRatingCount: pr.length,
      availableRoomsTonight: roomTotalByProp.has(p.id) ? (roomAvailByProp.get(p.id) ?? 0) : null,
    };
  });

  if (isSortByRating) {
    data.sort((a, b) => ((b.propertyRating as number | null) ?? 0) - ((a.propertyRating as number | null) ?? 0));
    data = data.slice((page - 1) * limit, page * limit);
  }

  return NextResponse.json({ data, total: total || 0, page, totalPages: Math.ceil((total || 0) / limit) });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "HOST" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only hosts can create listings" }, { status: 403 });
    }

    const body = await req.json();
    const isTransport = body.category === "TRANSPORT";
    const isRental = body.category === "BIKE_RENTAL" || body.category === "SURF_RENTAL";
    const isInventory = isTransport || isRental;
    const schema = isTransport ? TransportSchema : isRental ? RentalSchema : PropertySchema;
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const d = result.data as Record<string, unknown>;
    const amenities = d.amenities as string[] | undefined;
    const category = (d.category as string | undefined) ?? "STAY";
    const pricePerKm = d.pricePerKm as number | undefined;
    const mealPlan = (d.mealPlan as string | undefined) ?? "ROOM_ONLY";
    const priceBnB = (d.priceBnB != null && d.priceBnB !== "") ? Number(d.priceBnB) : null;
    const priceHalfBoard = (d.priceHalfBoard != null && d.priceHalfBoard !== "") ? Number(d.priceHalfBoard) : null;
    const priceFullBoard = (d.priceFullBoard != null && d.priceFullBoard !== "") ? Number(d.priceFullBoard) : null;
    const vehicleGroups = d.vehicleGroups as { type: string; count: number; maxPassengers?: number }[] | undefined;
    const roomTypesInput = body.roomTypes as Array<{
      typeName: string; displayLabel: string; roomCount: number; beds: number;
      maxGuests: number; bathrooms: number; amenities: string[];
      pricePerNight: number; priceBnB: number | null; priceHalfBoard: number | null; priceFullBoard: number | null;
    }> | undefined;

    const vehicleGroupsJson = vehicleGroups?.length ? JSON.stringify(vehicleGroups) : null;

    const { data: property, error: propertyInsertError } = await supabaseAdmin
      .from("Property")
      .insert({
        id: randomUUID(),
        title: d.title as string,
        description: d.description as string,
        propertyType: d.propertyType as string,
        address: d.address as string,
        district: d.district as string,
        latitude: d.latitude as number,
        longitude: d.longitude as number,
        pricePerNight: d.pricePerNight as number,
        minPrice: d.minPrice as number,
        maxGuests: d.maxGuests as number,
        bedrooms: d.bedrooms as number,
        bathrooms: d.bathrooms as number,
        beds: d.beds as number,
        hostId: session.user.id,
        status: "PENDING_APPROVAL",
        category,
        mealPlan,
        priceBnB,
        priceHalfBoard,
        priceFullBoard,
        vehicleGroups: vehicleGroupsJson,
        ...(typeof pricePerKm === "number" ? { pricePerKm } : {}),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (propertyInsertError || !property) {
      console.error("[POST /api/properties] Property insert failed:", propertyInsertError);
      return NextResponse.json({ error: "Failed to save listing. Please try again." }, { status: 500 });
    }

    if (amenities?.length) {
      await supabaseAdmin.from("PropertyAmenity").insert(amenities.map((name) => ({ propertyId: property.id, name })));
    }

    if (isInventory && vehicleGroups?.length) {
      const VEHICLE_SHORT: Record<string, string> = {
        CAR: "Car", VAN: "Van", TUK_TUK: "Tuk-Tuk", BUS: "Bus",
        BOAT: "Boat", MOTORBIKE: "Bike", JEEP: "Jeep", BICYCLE: "Bicycle",
        ELECTRIC_BIKE: "E-Bike", MOUNTAIN_BIKE: "MTB", ROAD_BIKE: "Road Bike",
        SCOOTER: "Scooter",
        SURFBOARD_BEGINNER: "Beginner Board", SURFBOARD_INTERMEDIATE: "Int Board",
        SURFBOARD_LONGBOARD: "Longboard", SURFBOARD_SHORTBOARD: "Shortboard",
        BODYBOARD: "Bodyboard", SUP_BOARD: "SUP", WETSUIT: "Wetsuit",
      };
      const roomData: { propertyId: string; name: string; maxGuests: number; isActive: boolean }[] = [];
      for (const group of vehicleGroups) {
        const name = VEHICLE_SHORT[group.type] ?? group.type;
        for (let i = 1; i <= group.count; i++) {
          roomData.push({ propertyId: property.id, name: `${name} ${i}`, maxGuests: group.maxPassengers ?? 1, isActive: true });
        }
      }
      if (roomData.length) await supabaseAdmin.from("Room").insert(roomData.map((r) => ({ id: randomUUID(), ...r })));
    } else if (!isInventory && roomTypesInput?.length) {
      for (const rt of roomTypesInput) {
        const { data: roomType, error: roomTypeError } = await supabaseAdmin
          .from("RoomType")
          .insert({
            id: randomUUID(),
            propertyId: property.id,
            typeName: rt.typeName,
            displayLabel: rt.displayLabel,
            roomCount: rt.roomCount,
            beds: rt.beds,
            maxGuests: rt.maxGuests,
            bathrooms: rt.bathrooms,
            amenities: JSON.stringify(rt.amenities ?? []),
            pricePerNight: rt.pricePerNight,
            priceBnB: rt.priceBnB ?? null,
            priceHalfBoard: rt.priceHalfBoard ?? null,
            priceFullBoard: rt.priceFullBoard ?? null,
            updatedAt: new Date().toISOString(),
          })
          .select()
          .single();
        if (roomTypeError || !roomType) {
          console.error("[POST /api/properties] RoomType insert failed:", roomTypeError);
          continue;
        }
        await supabaseAdmin.from("Room").insert(
          Array.from({ length: rt.roomCount }, (_, i) => ({
            id: randomUUID(),
            propertyId: property.id,
            roomTypeId: roomType.id,
            name: `${rt.displayLabel} ${i + 1}`,
            maxGuests: rt.maxGuests,
            isActive: true,
          }))
        );
      }
    } else if (!isInventory) {
      const bedroomCount = (d.bedrooms as number) || 0;
      if (bedroomCount > 0) {
        await supabaseAdmin.from("Room").insert(
          Array.from({ length: bedroomCount }, (_, i) => ({
            id: randomUUID(),
            propertyId: property.id, name: `Room ${i + 1}`, maxGuests: 2, isActive: true,
          }))
        );
      }
    }

    const { data: amenityRows } = await supabaseAdmin.from("PropertyAmenity").select("*").eq("propertyId", property.id);

    return NextResponse.json(
      { ...property, amenities: amenityRows || [], images: [], category, pricePerKm: pricePerKm ?? null },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/properties]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

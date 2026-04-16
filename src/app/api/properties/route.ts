import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PropertySchema, TransportSchema } from "@/lib/validations";
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
  const sortBy = searchParams.get("sortBy") || "newest"; // newest | price_asc | price_desc | rating_desc
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");

  const where: Record<string, unknown> = { status: "ACTIVE" };

  if (district) where.district = district; // SQLite: exact match (dropdown selection)
  if (minPrice || maxPrice) {
    where.pricePerNight = {};
    if (minPrice) (where.pricePerNight as Record<string, number>).gte = parseFloat(minPrice);
    if (maxPrice) (where.pricePerNight as Record<string, number>).lte = parseFloat(maxPrice);
  }
  if (guests) where.maxGuests = { gte: parseInt(guests) };
  if (propertyType) where.propertyType = propertyType;
  if (amenities) {
    const amenityList = amenities.split(",");
    where.amenities = { some: { name: { in: amenityList } } };
  }
  // `category` is unknown to the stale Prisma client — collect IDs via raw SQL first
  let categoryIds: string[] | null = null;
  if (category) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Property" WHERE "category" = ${category}
    `;
    categoryIds = rows.map((r) => r.id);
    if (categoryIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, totalPages: 0 });
    }
    where.id = { in: categoryIds };
  }

  // Determine sort order
  const orderBy: Record<string, string> =
    sortBy === "price_asc" ? { pricePerNight: "asc" } :
    sortBy === "price_desc" ? { pricePerNight: "desc" } :
    { createdAt: "desc" }; // newest (default) and rating_desc both start with newest; rating sort applied post-query

  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        host: { select: { id: true, name: true, image: true } },
        reviews: { select: { rating: true } },
        amenities: { select: { name: true, icon: true } },
      },
      orderBy,
      skip: sortBy === "rating_desc" ? 0 : (page - 1) * limit, // fetch all for rating sort, slice after
      take: sortBy === "rating_desc" ? undefined : limit,
    }),
  ]);

  const propertyIds = properties.map((p) => p.id);

  // Fetch category + pricePerKm (stale Prisma client doesn't know these columns)
  const extraRows: { id: string; category: string; pricePerKm: number | null; mealPlan: string; priceBnB: number | null; priceHalfBoard: number | null; priceFullBoard: number | null }[] =
    propertyIds.length > 0
      ? await prisma.$queryRawUnsafe(
          `SELECT id, category, pricePerKm, mealPlan, priceBnB, priceHalfBoard, priceFullBoard FROM "Property" WHERE id IN (${propertyIds.map(() => "?").join(",")})`,
          ...propertyIds
        )
      : [];
  const extraMap: Record<string, { category: string; pricePerKm: number | null; mealPlan: string; priceBnB: number | null; priceHalfBoard: number | null; priceFullBoard: number | null }> = {};
  for (const r of extraRows) extraMap[r.id] = { category: r.category, pricePerKm: r.pricePerKm, mealPlan: r.mealPlan ?? "ROOM_ONLY", priceBnB: r.priceBnB ?? null, priceHalfBoard: r.priceHalfBoard ?? null, priceFullBoard: r.priceFullBoard ?? null };

  // Fetch PropertyRating averages + counts for all returned properties
  const pratingRows: { propertyId: string; avgScore: number; isSeeded: number }[] =
    propertyIds.length > 0
      ? await prisma.$queryRawUnsafe(
          `SELECT propertyId, avgScore, isSeeded FROM "PropertyRating" WHERE propertyId IN (${propertyIds.map(() => "?").join(",")})`,
          ...propertyIds
        )
      : [];
  const pratingMap: Record<string, { scores: number[]; total: number; real: number }> = {};
  for (const row of pratingRows) {
    if (!pratingMap[row.propertyId]) pratingMap[row.propertyId] = { scores: [], total: 0, real: 0 };
    pratingMap[row.propertyId].scores.push(row.avgScore);
    pratingMap[row.propertyId].total++;
    if (!row.isSeeded) pratingMap[row.propertyId].real++;
  }

  let data = properties.map((p) => {
    const pr = pratingMap[p.id];
    const propertyRating = pr?.scores.length
      ? parseFloat((pr.scores.reduce((a, b) => a + b, 0) / pr.scores.length).toFixed(1))
      : null;
    return {
      ...p,
      ...extraMap[p.id],
      avgRating:
        p.reviews.length > 0
          ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
          : null,
      reviewCount: p.reviews.length,
      propertyRating,
      propertyRatingCount: pr?.total ?? 0,
    };
  });

  // Apply rating sort + pagination post-query (rating lives outside Prisma)
  if (sortBy === "rating_desc") {
    data.sort((a, b) => (b.propertyRating ?? 0) - (a.propertyRating ?? 0));
    data = data.slice((page - 1) * limit, page * limit);
  }

  const safePayload = JSON.parse(
    JSON.stringify(
      { data, total, page, totalPages: Math.ceil(total / limit) },
      (_k, v) => (typeof v === "bigint" ? Number(v) : v)
    )
  );
  return NextResponse.json(safePayload);
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
    const schema = isTransport ? TransportSchema : PropertySchema;
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    // Strip fields the stale Prisma client doesn't know about yet.
    // `category` and `pricePerKm` were added in migrations whose
    // `prisma generate` step was blocked by the locked DLL (dev server running).
    // We write them via $executeRaw after the create.
    const d = result.data as Record<string, unknown>;
    const amenities = d.amenities as string[] | undefined;
    const category = d.category as string | undefined;
    const pricePerKm = d.pricePerKm as number | undefined;
    const mealPlan = d.mealPlan as string | undefined;
    const priceBnB = (d.priceBnB != null && d.priceBnB !== "") ? Number(d.priceBnB) : null;
    const priceHalfBoard = (d.priceHalfBoard != null && d.priceHalfBoard !== "") ? Number(d.priceHalfBoard) : null;
    const priceFullBoard = (d.priceFullBoard != null && d.priceFullBoard !== "") ? Number(d.priceFullBoard) : null;
    const vehicleGroups = d.vehicleGroups as { type: string; count: number; maxPassengers?: number }[] | undefined;
    const roomTypesInput = body.roomTypes as Array<{
      typeName: string;
      displayLabel: string;
      roomCount: number;
      beds: number;
      maxGuests: number;
      bathrooms: number;
      amenities: string[];
      pricePerNight: number;
      priceBnB: number | null;
      priceHalfBoard: number | null;
      priceFullBoard: number | null;
    }> | undefined;

    const property = await prisma.property.create({
      data: {
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
        amenities: amenities?.length
          ? { create: amenities.map((name) => ({ name })) }
          : undefined,
      },
      include: { amenities: true, images: true },
    });

    // Write the columns the Prisma client doesn't know about via raw SQL
    const finalCategory = category ?? "STAY";
    const finalMealPlan = mealPlan ?? "ROOM_ONLY";
    const vehicleGroupsJson = vehicleGroups?.length ? JSON.stringify(vehicleGroups) : null;
    await prisma.$queryRawUnsafe(
      `UPDATE "Property" SET "category" = ?, "mealPlan" = ?, "priceBnB" = ?, "priceHalfBoard" = ?, "priceFullBoard" = ?, "vehicleGroups" = ? WHERE "id" = ?`,
      finalCategory, finalMealPlan, priceBnB, priceHalfBoard, priceFullBoard, vehicleGroupsJson, property.id
    );

    if (isTransport && typeof pricePerKm === "number") {
      await prisma.$executeRaw`UPDATE "Property" SET "pricePerKm" = ${pricePerKm} WHERE "id" = ${property.id}`;
    }

    const now = new Date().toISOString();

    if (isTransport && vehicleGroups?.length) {
      // Create one Room entry per individual vehicle (e.g. "Van 1", "Van 2", "Car 1"…)
      const VEHICLE_SHORT: Record<string, string> = {
        CAR: "Car", VAN: "Van", TUK_TUK: "Tuk-Tuk", BUS: "Bus",
        BOAT: "Boat", MOTORBIKE: "Bike", JEEP: "Jeep", BICYCLE: "Bicycle",
      };
      for (const group of vehicleGroups) {
        const name = VEHICLE_SHORT[group.type] ?? group.type;
        for (let i = 1; i <= group.count; i++) {
          const vehicleId = randomUUID();
          await prisma.$queryRawUnsafe(
            `INSERT INTO "Room" (id, propertyId, name, maxGuests, isActive, createdAt) VALUES (?, ?, ?, ?, 1, ?)`,
            vehicleId, property.id, `${name} ${i}`, group.maxPassengers ?? 4, now
          );
        }
      }
    } else if (!isTransport && roomTypesInput?.length) {
      // Create RoomType records and named Room instances for each type
      for (const rt of roomTypesInput) {
        const rtId = randomUUID();
        await prisma.$queryRawUnsafe(
          `INSERT INTO "RoomType" (id, propertyId, typeName, displayLabel, roomCount, beds, maxGuests, bathrooms, amenities, pricePerNight, priceBnB, priceHalfBoard, priceFullBoard, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          rtId, property.id, rt.typeName, rt.displayLabel, rt.roomCount,
          rt.beds, rt.maxGuests, rt.bathrooms,
          JSON.stringify(rt.amenities ?? []),
          rt.pricePerNight, rt.priceBnB ?? null, rt.priceHalfBoard ?? null, rt.priceFullBoard ?? null,
          now, now
        );
        for (let i = 1; i <= rt.roomCount; i++) {
          const roomId = randomUUID();
          await prisma.$queryRawUnsafe(
            `INSERT INTO "Room" (id, propertyId, roomTypeId, name, maxGuests, isActive, createdAt) VALUES (?, ?, ?, ?, ?, 1, ?)`,
            roomId, property.id, rtId, `${rt.displayLabel} ${i}`, rt.maxGuests, now
          );
        }
      }
    } else if (!isTransport) {
      // Fallback: auto-create rooms from bedroom count for properties without room types
      const bedroomCount = (d.bedrooms as number) || 0;
      for (let i = 1; i <= bedroomCount; i++) {
        const roomId = randomUUID();
        await prisma.$queryRawUnsafe(
          `INSERT INTO "Room" (id, propertyId, name, maxGuests, isActive, createdAt) VALUES (?, ?, ?, 2, 1, ?)`,
          roomId, property.id, `Room ${i}`, now
        );
      }
    }

    return NextResponse.json(
      { ...property, category: finalCategory, pricePerKm: pricePerKm ?? null },
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

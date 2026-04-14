import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PropertySchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      amenities: true,
      host: { select: { id: true, name: true, image: true, bio: true, createdAt: true } },
      reviews: {
        include: { author: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Enrich with columns the stale Prisma client doesn't know about
  const extras = await prisma.$queryRaw<{ category: string; pricePerKm: number | null; mealPlan: string; priceBnB: number | null; priceHalfBoard: number | null; priceFullBoard: number | null }[]>`
    SELECT category, pricePerKm, mealPlan, priceBnB, priceHalfBoard, priceFullBoard FROM "Property" WHERE id = ${id}
  `;
  const { category = "STAY", pricePerKm = null, mealPlan = "ROOM_ONLY", priceBnB = null, priceHalfBoard = null, priceFullBoard = null } = extras[0] ?? {};

  const avgRating =
    property.reviews.length > 0
      ? property.reviews.reduce((sum, r) => sum + r.rating, 0) / property.reviews.length
      : null;

  // PropertyRating: average of all avgScore values (includes seeded 10.0)
  const prRows = await prisma.$queryRawUnsafe<{ avgScore: number }[]>(
    `SELECT avgScore FROM "PropertyRating" WHERE propertyId = ?`,
    id
  );
  const propertyRating =
    prRows.length > 0
      ? parseFloat((prRows.reduce((s, r) => s + r.avgScore, 0) / prRows.length).toFixed(1))
      : null;
  const propertyRatingCount = prRows.filter((r) => !("isSeeded" in r)).length || prRows.length;

  return NextResponse.json({
    ...property, category, pricePerKm, mealPlan, priceBnB, priceHalfBoard, priceFullBoard,
    avgRating, reviewCount: property.reviews.length, propertyRating, propertyRatingCount,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (property.hostId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  // Extract raw columns before schema validation
  const rawPricePerKm = typeof body.pricePerKm === "number" ? body.pricePerKm : undefined;
  const rawMealPlan = typeof body.mealPlan === "string" ? body.mealPlan : undefined;

  const result = PropertySchema.partial().safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { amenities, ...data } = result.data;

  const updated = await prisma.property.update({
    where: { id },
    data: {
      ...data,
      amenities: amenities
        ? {
            deleteMany: {},
            create: amenities.map((name) => ({ name })),
          }
        : undefined,
    },
    include: { amenities: true, images: true },
  });

  // Update raw columns the Prisma client doesn't know about
  const rawPriceBnB = body.priceBnB !== undefined ? (body.priceBnB === null ? null : Number(body.priceBnB)) : undefined;
  const rawPriceHalf = body.priceHalfBoard !== undefined ? (body.priceHalfBoard === null ? null : Number(body.priceHalfBoard)) : undefined;
  const rawPriceFull = body.priceFullBoard !== undefined ? (body.priceFullBoard === null ? null : Number(body.priceFullBoard)) : undefined;

  const rawCols = [
    rawPricePerKm !== undefined && [`"pricePerKm"`, rawPricePerKm],
    rawMealPlan !== undefined && [`"mealPlan"`, rawMealPlan],
    rawPriceBnB !== undefined && [`"priceBnB"`, rawPriceBnB],
    rawPriceHalf !== undefined && [`"priceHalfBoard"`, rawPriceHalf],
    rawPriceFull !== undefined && [`"priceFullBoard"`, rawPriceFull],
  ].filter(Boolean) as [string, unknown][];

  if (rawCols.length > 0) {
    const sets = rawCols.map(([col]) => `${col} = ?`).join(", ");
    const vals = [...rawCols.map(([, v]) => v), id];
    await prisma.$queryRawUnsafe(`UPDATE "Property" SET ${sets} WHERE id = ?`, ...vals);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (property.hostId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.property.update({ where: { id }, data: { status: "INACTIVE" } });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PropertySchema } from "@/lib/validations";
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const district = searchParams.get("district");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const guests = searchParams.get("guests");
  const propertyType = searchParams.get("propertyType");
  const amenities = searchParams.get("amenities");
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
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const data = properties.map((p) => ({
    ...p,
    avgRating:
      p.reviews.length > 0
        ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
        : null,
    reviewCount: p.reviews.length,
  }));

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "HOST" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only hosts can create listings" }, { status: 403 });
  }

  const body = await req.json();
  const result = PropertySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { amenities, ...data } = result.data;

  const property = await prisma.property.create({
    data: {
      ...data,
      hostId: session.user.id,
      status: "ACTIVE",
      amenities: amenities?.length
        ? { create: amenities.map((name) => ({ name })) }
        : undefined,
    },
    include: { amenities: true, images: true },
  });

  return NextResponse.json(property, { status: 201 });
}

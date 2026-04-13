import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { host: { name: { contains: search } } },
      { host: { email: { contains: search } } },
    ];
  }

  // `category` is unknown to the stale Prisma client — omit it from select,
  // then enrich via raw SQL.
  const properties = await prisma.property.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      district: true,
      status: true,
      pricePerNight: true,
      createdAt: true,
      host: { select: { name: true, email: true, phone: true } },
    },
  });

  if (properties.length === 0) return NextResponse.json([]);

  // Fetch category + pricePerKm for these IDs via raw SQL
  const ids = properties.map((p) => p.id);
  const placeholders = ids.map(() => "?").join(",");
  const extras = await prisma.$queryRawUnsafe<{ id: string; category: string; pricePerKm: number | null }[]>(
    `SELECT id, category, pricePerKm FROM "Property" WHERE id IN (${placeholders})`,
    ...ids
  );
  const extraMap = Object.fromEntries(extras.map((e) => [e.id, e]));

  const enriched = properties.map((p) => ({
    ...p,
    category: extraMap[p.id]?.category ?? "STAY",
    pricePerKm: extraMap[p.id]?.pricePerKm ?? null,
  }));

  return NextResponse.json(enriched);
}

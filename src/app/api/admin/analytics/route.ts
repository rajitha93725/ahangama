import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const days = parseInt(searchParams.get("days") || "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalProperties,
    totalBookings,
    recentBookings,
    newUsers,
    bookingsByStatus,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.property.count({ where: { status: "ACTIVE" } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.booking.groupBy({ by: ["status"], _count: true }),
  ]);

  const completedBookings = await prisma.booking.findMany({
    where: { status: "ACCEPTED", createdAt: { gte: since } },
    select: { totalPrice: true },
  });

  const revenue = completedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const topProperties = await prisma.property.findMany({
    where: { status: "ACTIVE" },
    include: {
      bookings: { where: { status: { in: ["ACCEPTED", "COMPLETED"] } }, select: { totalPrice: true } },
      images: { where: { isPrimary: true }, take: 1 },
    },
    take: 10,
  });

  const ranked = topProperties
    .map((p) => ({
      id: p.id,
      title: p.title,
      district: p.district,
      image: p.images[0]?.url || null,
      bookingCount: p.bookings.length,
      revenue: p.bookings.reduce((s, b) => s + (b.totalPrice || 0), 0),
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount);

  return NextResponse.json({
    totalUsers,
    totalProperties,
    totalBookings,
    recentBookings,
    newUsers,
    revenue,
    bookingsByStatus,
    topProperties: ranked,
  });
}

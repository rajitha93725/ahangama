import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [guestCount, hostCount, pendingUsers, pendingProperties, confirmedBookings] = await Promise.all([
    prisma.user.count({ where: { role: "GUEST" } }),
    prisma.user.count({ where: { role: "HOST" } }),
    prisma.user.count({ where: { isActive: false, role: { not: "ADMIN" } } }),
    prisma.property.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.booking.findMany({
      where: { status: { in: ["ACCEPTED", "COMPLETED"] } },
      select: { totalPrice: true },
    }),
  ]);

  const revenue = confirmedBookings.reduce((s, b) => s + (b.totalPrice || 0), 0);

  return NextResponse.json({ guestCount, hostCount, pendingUsers, pendingProperties, revenue });
}

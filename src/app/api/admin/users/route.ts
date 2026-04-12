import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const role = searchParams.get("role");
  const search = searchParams.get("search");
  const activeParam = searchParams.get("active");

  const where: Record<string, unknown> = { role: { not: "ADMIN" } };
  if (role) where.role = role;
  if (activeParam === "false") where.isActive = false;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      phone: true,
      _count: {
        select: { properties: true, bookingsAsGuest: true },
      },
    },
  });

  return NextResponse.json(users);
}

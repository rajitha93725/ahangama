import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (property.hostId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { url, alt, isPrimary, order } = await req.json();

  if (isPrimary) {
    await prisma.propertyImage.updateMany({ where: { propertyId: id }, data: { isPrimary: false } });
  }

  const image = await prisma.propertyImage.create({
    data: { propertyId: id, url, alt, isPrimary: isPrimary ?? false, order: order ?? 0 },
  });

  return NextResponse.json(image, { status: 201 });
}

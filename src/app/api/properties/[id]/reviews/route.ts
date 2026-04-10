import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reviews = await prisma.review.findMany({
    where: { propertyId: id },
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: propertyId } = await params;
  const body = await req.json();
  const result = ReviewSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: {
      propertyId,
      guestId: session.user.id,
      status: "COMPLETED",
      review: null,
    },
    include: { property: { select: { hostId: true } } },
  });

  if (!booking) {
    return NextResponse.json(
      { error: "You must have completed a stay to review this property" },
      { status: 400 }
    );
  }

  const review = await prisma.review.create({
    data: {
      ...result.data,
      propertyId,
      bookingId: booking.id,
      authorId: session.user.id,
      hostId: booking.property.hostId,
    },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(review, { status: 201 });
}

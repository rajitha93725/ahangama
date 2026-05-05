import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/host/rooms/[id] — update a room
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership via property join
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT r.id FROM "Room" r
     INNER JOIN "Property" p ON p.id = r."propertyId"
     WHERE r.id = $1 AND p."hostId" = $2`,
    id,
    session.user.id
  );
  if (!rows.length) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, description, maxGuests, isActive } = body;

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: "Room name cannot be empty" }, { status: 400 });
  }

  // Build dynamic SET clause with PostgreSQL $N placeholders
  const updates: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { values.push(name.trim()); updates.push(`name = $${values.length}`); }
  if (description !== undefined) { values.push(description || null); updates.push(`description = $${values.length}`); }
  if (maxGuests !== undefined) { values.push(Number(maxGuests)); updates.push(`"maxGuests" = $${values.length}`); }
  if (isActive !== undefined) { values.push(isActive); updates.push(`"isActive" = $${values.length}`); }

  if (!updates.length) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(id);
  await prisma.$queryRawUnsafe(
    `UPDATE "Room" SET ${updates.join(", ")} WHERE id = $${values.length}`,
    ...values
  );

  const [room] = await prisma.$queryRawUnsafe<{ id: string; propertyId: string; name: string; description: string | null; maxGuests: number; isActive: boolean }[]>(
    `SELECT * FROM "Room" WHERE id = $1`,
    id
  );

  return NextResponse.json(room);
}

// DELETE /api/host/rooms/[id] — soft-delete a room
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT r.id FROM "Room" r
     INNER JOIN "Property" p ON p.id = r."propertyId"
     WHERE r.id = $1 AND p."hostId" = $2`,
    id,
    session.user.id
  );
  if (!rows.length) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  await prisma.$executeRaw`UPDATE "Room" SET "isActive" = false WHERE id = ${id}`;

  return NextResponse.json({ success: true });
}

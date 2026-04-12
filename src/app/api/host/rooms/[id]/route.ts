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
     INNER JOIN "Property" p ON p.id = r.propertyId
     WHERE r.id = ? AND p.hostId = ?`,
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

  // Build dynamic SET clause
  const updates: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { updates.push(`name = ?`); values.push(name.trim()); }
  if (description !== undefined) { updates.push(`description = ?`); values.push(description || null); }
  if (maxGuests !== undefined) { updates.push(`maxGuests = ?`); values.push(Number(maxGuests)); }
  if (isActive !== undefined) { updates.push(`isActive = ?`); values.push(isActive ? 1 : 0); }

  if (!updates.length) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(id);
  await prisma.$queryRawUnsafe(
    `UPDATE "Room" SET ${updates.join(", ")} WHERE id = ?`,
    ...values
  );

  const [room] = await prisma.$queryRawUnsafe<{ id: string; propertyId: string; name: string; description: string | null; maxGuests: number; isActive: number }[]>(
    `SELECT * FROM "Room" WHERE id = ?`,
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
     INNER JOIN "Property" p ON p.id = r.propertyId
     WHERE r.id = ? AND p.hostId = ?`,
    id,
    session.user.id
  );
  if (!rows.length) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  await prisma.$executeRaw`UPDATE "Room" SET isActive = 0 WHERE id = ${id}`;

  return NextResponse.json({ success: true });
}

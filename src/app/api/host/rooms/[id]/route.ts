import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: hostProperties } = await supabaseAdmin.from("Property").select("id").eq("hostId", session.user.id);
  const hostPropertyIds = (hostProperties || []).map((p: { id: string }) => p.id);

  const { data: existing } = await supabaseAdmin
    .from("Room")
    .select("id")
    .eq("id", id)
    .in("propertyId", hostPropertyIds)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, maxGuests, isActive } = body;

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: "Room name cannot be empty" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description || null;
  if (maxGuests !== undefined) updateData.maxGuests = Number(maxGuests);
  if (isActive !== undefined) updateData.isActive = isActive;

  if (!Object.keys(updateData).length) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: room } = await supabaseAdmin.from("Room").update(updateData).eq("id", id).select().single();
  return NextResponse.json(room);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data: hostProperties } = await supabaseAdmin.from("Property").select("id").eq("hostId", session.user.id);
  const hostPropertyIds = (hostProperties || []).map((p: { id: string }) => p.id);

  const { data: existing } = await supabaseAdmin
    .from("Room")
    .select("id")
    .eq("id", id)
    .in("propertyId", hostPropertyIds)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  await supabaseAdmin.from("Room").update({ isActive: false }).eq("id", id);
  return NextResponse.json({ success: true });
}

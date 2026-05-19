import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const propertyId = searchParams.get("propertyId");

  const { data: hostProperties } = await supabaseAdmin
    .from("Property")
    .select("id")
    .eq("hostId", session.user.id);
  const hostPropertyIds = (hostProperties || []).map((p: { id: string }) => p.id);
  if (!hostPropertyIds.length) return NextResponse.json([]);

  const ids = propertyId ? [propertyId].filter((id) => hostPropertyIds.includes(id)) : hostPropertyIds;
  if (!ids.length) return NextResponse.json([]);

  const { data: rooms } = await supabaseAdmin
    .from("Room")
    .select("id, propertyId, name, description, maxGuests, isActive, createdAt")
    .in("propertyId", ids)
    .eq("isActive", true)
    .order("propertyId")
    .order("createdAt");

  return NextResponse.json(rooms || []);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { propertyId, name, description, maxGuests } = body;

  if (!propertyId || !name?.trim()) {
    return NextResponse.json({ error: "propertyId and name are required" }, { status: 400 });
  }

  const { data: property } = await supabaseAdmin
    .from("Property")
    .select("id")
    .eq("id", propertyId)
    .eq("hostId", session.user.id)
    .maybeSingle();
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const { data: room } = await supabaseAdmin
    .from("Room")
    .insert({ id: randomUUID(), propertyId, name: name.trim(), description: description ?? null, maxGuests: Number(maxGuests) || 2, isActive: true })
    .select()
    .single();

  return NextResponse.json(room, { status: 201 });
}

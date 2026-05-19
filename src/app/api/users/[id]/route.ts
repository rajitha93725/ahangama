import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { ProfileUpdateSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: user } = await supabaseAdmin
    .from("User")
    .select("id, name, image, bio, role, createdAt, isActive")
    .eq("id", id)
    .maybeSingle();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: properties } = await supabaseAdmin
    .from("Property")
    .select("id, title, status, district, pricePerNight")
    .eq("hostId", id)
    .eq("status", "ACTIVE")
    .limit(6);

  const propIds = (properties || []).map((p: { id: string }) => p.id);
  const { data: images } = propIds.length
    ? await supabaseAdmin.from("PropertyImage").select("propertyId, url, alt").in("propertyId", propIds).eq("isPrimary", true)
    : { data: [] };

  const imageByProp = Object.fromEntries(
    (images || []).map((img: { propertyId: string; url: string; alt: string | null }) => [img.propertyId, img])
  );

  return NextResponse.json({
    ...user,
    properties: (properties || []).map((p: { id: string; [key: string]: unknown }) => ({
      ...p,
      images: imageByProp[p.id] ? [imageByProp[p.id]] : [],
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (session.user.id !== id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const result = ProfileUpdateSchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  const { data: updated } = await supabaseAdmin
    .from("User")
    .update({ ...result.data, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, email, image, role, bio, phone")
    .single();

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await supabaseAdmin.from("User").update({ isActive: false, updatedAt: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ success: true });
}

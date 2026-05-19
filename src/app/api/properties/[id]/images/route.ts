import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: property } = await supabaseAdmin.from("Property").select("id, hostId").eq("id", id).maybeSingle();
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (property.hostId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { url, alt, isPrimary, order } = await req.json();

  if (isPrimary) {
    await supabaseAdmin.from("PropertyImage").update({ isPrimary: false }).eq("propertyId", id);
  }

  const { data: image } = await supabaseAdmin
    .from("PropertyImage")
    .insert({ id: randomUUID(), propertyId: id, url, alt, isPrimary: isPrimary ?? false, order: order ?? 0 })
    .select()
    .single();

  return NextResponse.json(image, { status: 201 });
}

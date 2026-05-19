import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string; imageId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, imageId } = await params;
  const { data: property } = await supabaseAdmin.from("Property").select("id, hostId").eq("id", id).maybeSingle();
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (property.hostId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (body.isPrimary === true) {
    await supabaseAdmin.from("PropertyImage").update({ isPrimary: false }).eq("propertyId", id);
  }

  const { data: image } = await supabaseAdmin
    .from("PropertyImage")
    .update({ ...body })
    .eq("id", imageId)
    .eq("propertyId", id)
    .select()
    .single();

  return NextResponse.json(image);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, imageId } = await params;
  const { data: property } = await supabaseAdmin.from("Property").select("id, hostId").eq("id", id).maybeSingle();
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (property.hostId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await supabaseAdmin.from("PropertyImage").delete().eq("id", imageId).eq("propertyId", id);

  return new NextResponse(null, { status: 204 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: properties } = await supabaseAdmin
    .from("Property")
    .select("id, title, bedrooms")
    .eq("hostId", session.user.id)
    .eq("category", "STAY")
    .gt("bedrooms", 0);

  if (!properties?.length) return NextResponse.json({ created: 0, provisioned: [] });

  const propertyIds = properties.map((p: { id: string }) => p.id);
  const { data: existingRooms } = await supabaseAdmin
    .from("Room")
    .select("propertyId")
    .in("propertyId", propertyIds)
    .eq("isActive", true);

  const propertiesWithRooms = new Set((existingRooms || []).map((r: { propertyId: string }) => r.propertyId));
  const toProvision = (properties as { id: string; title: string; bedrooms: number }[]).filter(
    (p) => !propertiesWithRooms.has(p.id)
  );

  let totalCreated = 0;
  const provisioned: { propertyId: string; title: string; roomsCreated: number }[] = [];

  for (const property of toProvision) {
    const count = property.bedrooms ?? 0;
    if (count <= 0) continue;
    await supabaseAdmin.from("Room").insert(
      Array.from({ length: count }, (_, i) => ({
        id: randomUUID(),
        propertyId: property.id,
        name: `Room ${i + 1}`,
        maxGuests: 2,
        isActive: true,
      }))
    );
    totalCreated += count;
    provisioned.push({ propertyId: property.id, title: property.title, roomsCreated: count });
  }

  return NextResponse.json({ created: totalCreated, provisioned });
}

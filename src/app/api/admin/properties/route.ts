import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 10;

  let propertyIds: string[] | null = null;

  if (search) {
    // Find properties matching title
    const { data: titleMatches } = await supabaseAdmin
      .from("Property")
      .select("id")
      .ilike("title", `%${search}%`);

    // Find hosts matching name or email
    const { data: hostMatches } = await supabaseAdmin
      .from("User")
      .select("id")
      .or(`name.ilike.%${search}%,email.ilike.%${search}%`);

    const titleIds = (titleMatches || []).map((p: { id: string }) => p.id);
    const hostIds = (hostMatches || []).map((u: { id: string }) => u.id);

    if (hostIds.length > 0) {
      const { data: hostPropMatches } = await supabaseAdmin
        .from("Property")
        .select("id")
        .in("hostId", hostIds);
      const hostPropIds = (hostPropMatches || []).map((p: { id: string }) => p.id);
      propertyIds = [...new Set([...titleIds, ...hostPropIds])];
    } else {
      propertyIds = titleIds;
    }

    if (propertyIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, totalPages: 0 });
    }
  }

  let countQuery = supabaseAdmin.from("Property").select("*", { count: "exact", head: true });
  let dataQuery = supabaseAdmin
    .from("Property")
    .select("id, title, district, status, pricePerNight, pricePerKm, category, createdAt, hostId")
    .order("createdAt", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (status) { countQuery = countQuery.eq("status", status); dataQuery = dataQuery.eq("status", status); }
  if (propertyIds) { countQuery = countQuery.in("id", propertyIds); dataQuery = dataQuery.in("id", propertyIds); }

  const [{ count: total }, { data: properties }] = await Promise.all([countQuery, dataQuery]);

  if (!properties?.length) return NextResponse.json({ data: [], total: total || 0, page, totalPages: Math.ceil((total || 0) / limit) });

  const hostIds = [...new Set(properties.map((p: { hostId: string }) => p.hostId))];
  const { data: hosts } = await supabaseAdmin
    .from("User")
    .select("id, name, email, phone")
    .in("id", hostIds);

  const hostMap = Object.fromEntries((hosts || []).map((h: { id: string; name: string; email: string; phone: string | null }) => [h.id, h]));

  const data = properties.map((p: { hostId: string; [key: string]: unknown }) => ({
    ...p,
    host: hostMap[p.hostId] ?? { name: null, email: null, phone: null },
  }));

  return NextResponse.json({ data, total: total || 0, page, totalPages: Math.ceil((total || 0) / limit) });
}

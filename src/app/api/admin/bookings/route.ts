import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("Booking")
    .select("id, checkIn, checkOut, guests, status, totalPrice, nights, createdAt, mealPlan, roomsRequested, pickupPoint, dropPoint, distanceKm, guestId, propertyId", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: bookings, count, error } = await query;

  if (error) {
    console.error("[GET /api/admin/bookings]", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }

  if (!bookings?.length) {
    return NextResponse.json({ data: [], total: 0, totalPages: 0 });
  }

  const guestIds = [...new Set(bookings.map((b: { guestId: string }) => b.guestId))];
  const propertyIds = [...new Set(bookings.map((b: { propertyId: string }) => b.propertyId))];

  const [{ data: guests }, { data: properties }] = await Promise.all([
    supabaseAdmin.from("User").select("id, name, email").in("id", guestIds),
    supabaseAdmin.from("Property").select("id, title, district, category").in("id", propertyIds),
  ]);

  const guestMap = Object.fromEntries((guests || []).map((g: { id: string; name: string | null; email: string }) => [g.id, g]));
  const propMap = Object.fromEntries((properties || []).map((p: { id: string; title: string; district: string; category: string }) => [p.id, p]));

  let result = bookings.map((b: { guestId: string; propertyId: string; [key: string]: unknown }) => ({
    ...b,
    guest: guestMap[b.guestId] ?? { id: b.guestId, name: null, email: null },
    property: propMap[b.propertyId] ?? { id: b.propertyId, title: null, district: null, category: null },
  }));

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (b: { guest: { name: string | null; email: string }; property: { title: string | null; district: string | null } }) =>
        b.guest.name?.toLowerCase().includes(q) ||
        b.guest.email?.toLowerCase().includes(q) ||
        b.property.title?.toLowerCase().includes(q) ||
        b.property.district?.toLowerCase().includes(q)
    );
  }

  const total = search ? result.length : (count ?? 0);
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ data: result, total, totalPages });
}

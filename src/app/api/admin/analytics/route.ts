import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const days = parseInt(searchParams.get("days") || "30");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: totalProperties },
    { count: totalBookings },
    { count: recentBookings },
    { count: newUsers },
    { data: allBookings },
    { data: topPropertyData },
  ] = await Promise.all([
    supabaseAdmin.from("User").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("Property").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabaseAdmin.from("Booking").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("Booking").select("*", { count: "exact", head: true }).gte("createdAt", since),
    supabaseAdmin.from("User").select("*", { count: "exact", head: true }).gte("createdAt", since),
    supabaseAdmin.from("Booking").select("status, totalPrice").gte("createdAt", since),
    supabaseAdmin.from("Property").select("id, title, district").eq("status", "ACTIVE").limit(10),
  ]);

  const revenue = (allBookings || [])
    .filter((b: { status: string }) => b.status === "ACCEPTED")
    .reduce((sum: number, b: { totalPrice: number | null }) => sum + (b.totalPrice || 0), 0);

  const bookingsByStatusMap: Record<string, number> = {};
  (allBookings || []).forEach((b: { status: string }) => {
    bookingsByStatusMap[b.status] = (bookingsByStatusMap[b.status] || 0) + 1;
  });
  const bookingsByStatus = Object.entries(bookingsByStatusMap).map(([status, _count]) => ({ status, _count }));

  const propIds = (topPropertyData || []).map((p: { id: string }) => p.id);
  const [{ data: propBookings }, { data: propImages }] = await Promise.all([
    supabaseAdmin.from("Booking").select("propertyId, totalPrice").in("propertyId", propIds).in("status", ["ACCEPTED", "COMPLETED"]),
    supabaseAdmin.from("PropertyImage").select("propertyId, url").in("propertyId", propIds).eq("isPrimary", true),
  ]);

  const bookingsByProp: Record<string, { count: number; revenue: number }> = {};
  (propBookings || []).forEach((b: { propertyId: string; totalPrice: number | null }) => {
    if (!bookingsByProp[b.propertyId]) bookingsByProp[b.propertyId] = { count: 0, revenue: 0 };
    bookingsByProp[b.propertyId].count++;
    bookingsByProp[b.propertyId].revenue += b.totalPrice || 0;
  });

  const imageByProp: Record<string, string> = {};
  (propImages || []).forEach((img: { propertyId: string; url: string }) => { imageByProp[img.propertyId] = img.url; });

  const topProperties = (topPropertyData || [])
    .map((p: { id: string; title: string; district: string }) => ({
      id: p.id,
      title: p.title,
      district: p.district,
      image: imageByProp[p.id] || null,
      bookingCount: bookingsByProp[p.id]?.count || 0,
      revenue: bookingsByProp[p.id]?.revenue || 0,
    }))
    .sort((a: { bookingCount: number }, b: { bookingCount: number }) => b.bookingCount - a.bookingCount);

  return NextResponse.json({
    totalUsers, totalProperties, totalBookings, recentBookings, newUsers,
    revenue, bookingsByStatus, topProperties,
  });
}

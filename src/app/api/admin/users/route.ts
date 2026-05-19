import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const role = searchParams.get("role");
  const search = searchParams.get("search");
  const activeParam = searchParams.get("active");

  let query = supabaseAdmin
    .from("User")
    .select("id, name, email, role, isActive, createdAt, phone")
    .neq("role", "ADMIN")
    .order("createdAt", { ascending: false });

  if (role) query = query.eq("role", role);
  if (activeParam === "false") query = query.eq("isActive", false);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

  const { data: users } = await query;
  if (!users?.length) return NextResponse.json([]);

  const userIds = users.map((u: { id: string }) => u.id);
  const [{ data: properties }, { data: bookings }] = await Promise.all([
    supabaseAdmin.from("Property").select("hostId").in("hostId", userIds),
    supabaseAdmin.from("Booking").select("guestId").in("guestId", userIds),
  ]);

  const propCount: Record<string, number> = {};
  (properties || []).forEach((p: { hostId: string }) => { propCount[p.hostId] = (propCount[p.hostId] || 0) + 1; });
  const bookingCount: Record<string, number> = {};
  (bookings || []).forEach((b: { guestId: string }) => { bookingCount[b.guestId] = (bookingCount[b.guestId] || 0) + 1; });

  return NextResponse.json(
    users.map((u: { id: string; [key: string]: unknown }) => ({
      ...u,
      _count: { properties: propCount[u.id] || 0, bookingsAsGuest: bookingCount[u.id] || 0 },
    }))
  );
}

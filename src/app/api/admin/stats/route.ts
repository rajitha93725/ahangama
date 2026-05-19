import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [
    { count: guestCount },
    { count: hostCount },
    { count: pendingUsers },
    { count: pendingProperties },
    { data: confirmedBookings },
  ] = await Promise.all([
    supabaseAdmin.from("User").select("*", { count: "exact", head: true }).eq("role", "GUEST"),
    supabaseAdmin.from("User").select("*", { count: "exact", head: true }).eq("role", "HOST"),
    supabaseAdmin.from("User").select("*", { count: "exact", head: true }).eq("isActive", false).neq("role", "ADMIN"),
    supabaseAdmin.from("Property").select("*", { count: "exact", head: true }).eq("status", "PENDING_APPROVAL"),
    supabaseAdmin.from("Booking").select("totalPrice").in("status", ["ACCEPTED", "COMPLETED"]),
  ]);

  const revenue = (confirmedBookings || []).reduce((s: number, b: { totalPrice: number | null }) => s + (b.totalPrice || 0), 0);

  return NextResponse.json({ guestCount, hostCount, pendingUsers, pendingProperties, revenue });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: notifications } = await supabaseAdmin
    .from("Notification")
    .select("*")
    .eq("userId", session.user.id)
    .order("createdAt", { ascending: false })
    .limit(50);

  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;
  return NextResponse.json({ notifications: notifications || [], unreadCount });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json();

  const query = supabaseAdmin
    .from("Notification")
    .update({ isRead: true })
    .eq("userId", session.user.id);

  if (ids?.length) {
    await query.in("id", ids);
  } else {
    await query;
  }

  return NextResponse.json({ success: true });
}

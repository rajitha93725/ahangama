import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await req.json();

  if (!["activate", "deactivate", "approve"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const isActive = action === "activate" || action === "approve";

  const { data: user } = await supabaseAdmin
    .from("User")
    .update({ isActive, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, email, role, isActive")
    .single();

  return NextResponse.json(user);
}

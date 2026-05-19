import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

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

  const statusMap: Record<string, string> = {
    approve: "ACTIVE",
    reject: "SUSPENDED",
    activate: "ACTIVE",
    deactivate: "INACTIVE",
    suspend: "SUSPENDED",
  };

  if (!statusMap[action]) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: property } = await supabaseAdmin
    .from("Property")
    .update({ status: statusMap[action], updatedAt: new Date().toISOString() })
    .eq("id", id)
    .select("id, title, status, hostId")
    .single();

  if (action === "approve") {
    const { count: seededCount } = await supabaseAdmin
      .from("PropertyRating")
      .select("*", { count: "exact", head: true })
      .eq("propertyId", id)
      .eq("isSeeded", true);

    const needed = 10 - (seededCount || 0);
    if (needed > 0) {
      const now = new Date();
      await supabaseAdmin.from("PropertyRating").insert(
        Array.from({ length: needed }, (_, i) => ({
          id: randomUUID(),
          propertyId: id,
          q1: 10, q2: 10, q3: 10, q4: 10, q5: 10,
          q6: 0, q7: 0, q8: 0, q9: 0, q10: 0,
          avgScore: 10,
          isSeeded: true,
          createdAt: new Date(now.getTime() - ((seededCount || 0) + i) * 86400000).toISOString(),
        }))
      );
    }
  }

  return NextResponse.json(property);
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { randomUUID } from "crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  const { data: rows } = await supabaseAdmin
    .from("PropertyRating")
    .select("id, q1, q2, q3, q4, q5, avgScore, comment")
    .eq("propertyId", id)
    .eq("isSeeded", true)
    .order("createdAt", { ascending: false });

  const guests = Array.from({ length: 10 }, (_, i) => {
    const row = rows?.[i];
    return {
      id: row?.id ?? null,
      q1: row ? Number(row.q1) : 10,
      q2: row ? Number(row.q2) : 10,
      q3: row ? Number(row.q3) : 10,
      q4: row ? Number(row.q4) : 10,
      q5: row ? Number(row.q5) : 10,
      avgScore: row ? Number(row.avgScore) : 10,
      comment: row?.comment ?? "",
    };
  });

  return NextResponse.json({ guests });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const guests = body.guests as Array<{
    q1: number; q2: number; q3: number; q4: number; q5: number; comment?: string;
  }>;

  if (!Array.isArray(guests) || guests.length !== 10) {
    return NextResponse.json({ error: "Expected array of 10 guest ratings" }, { status: 400 });
  }

  for (const g of guests) {
    const qs = [g.q1, g.q2, g.q3, g.q4, g.q5];
    if (qs.some((q) => typeof q !== "number" || q < 1 || q > 10)) {
      return NextResponse.json({ error: "All scores must be 1–10" }, { status: 400 });
    }
  }

  const now = new Date();
  await supabaseAdmin.from("PropertyRating").delete().eq("propertyId", id).eq("isSeeded", true);
  await supabaseAdmin.from("PropertyRating").insert(
    guests.map((g, i) => ({
      id: randomUUID(),
      propertyId: id,
      q1: g.q1, q2: g.q2, q3: g.q3, q4: g.q4, q5: g.q5,
      q6: 0, q7: 0, q8: 0, q9: 0, q10: 0,
      avgScore: parseFloat(([g.q1, g.q2, g.q3, g.q4, g.q5].reduce((a, b) => a + b, 0) / 5).toFixed(2)),
      isSeeded: true,
      comment: g.comment?.trim() || null,
      createdAt: new Date(now.getTime() - i * 86400000).toISOString(),
    }))
  );

  return NextResponse.json({ saved: 10 });
}

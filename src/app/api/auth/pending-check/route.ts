import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { identifier, password } = await req.json();
  if (!identifier || !password) return NextResponse.json({ pending: false });

  const id = (identifier as string).trim();
  const isEmail = id.includes("@");

  const query = supabaseAdmin.from("User").select("*");
  const { data: user } = isEmail
    ? await query.eq("email", id).maybeSingle()
    : await query.eq("phone", id).maybeSingle();

  if (!user || !user.passwordHash) return NextResponse.json({ pending: false });

  const valid = await bcrypt.compare(password as string, user.passwordHash);
  if (!valid) return NextResponse.json({ pending: false });

  if (user.isActive) return NextResponse.json({ pending: false });

  const { data: admin } = await supabaseAdmin
    .from("User")
    .select("phone")
    .eq("role", "ADMIN")
    .not("phone", "is", null)
    .maybeSingle();

  return NextResponse.json({ pending: true, adminPhone: admin?.phone ?? null });
}

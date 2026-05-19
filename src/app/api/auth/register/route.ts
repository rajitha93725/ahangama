import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { RegisterSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }

    const { name, email, password, role, phone } = result.data;

    const { data: existingEmail } = await supabaseAdmin.from("User").select("id").eq("email", email).maybeSingle();
    if (existingEmail) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const { data: existingPhone } = await supabaseAdmin.from("User").select("id").eq("phone", phone).maybeSingle();
    if (existingPhone) {
      return NextResponse.json({ error: "Phone number already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: user, error: insertError } = await supabaseAdmin
      .from("User")
      .insert({ id: randomUUID(), name, email, passwordHash, role, isActive: false, phone, updatedAt: new Date().toISOString() })
      .select("id, name, email, role")
      .single();

    if (insertError || !user) {
      console.error("[POST /api/auth/register] Insert failed:", insertError);
      return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ...user, pendingApproval: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

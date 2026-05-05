import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { identifier, password } = await req.json();
  if (!identifier || !password) return NextResponse.json({ pending: false });

  const id = (identifier as string).trim();
  const isEmail = id.includes("@");

  const user = isEmail
    ? await prisma.user.findUnique({ where: { email: id } })
    : await prisma.user.findFirst({ where: { phone: id } });

  if (!user || !user.passwordHash) return NextResponse.json({ pending: false });

  const valid = await bcrypt.compare(password as string, user.passwordHash);
  if (!valid) return NextResponse.json({ pending: false });

  if (user.isActive) return NextResponse.json({ pending: false });

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", phone: { not: null } },
    select: { phone: true },
  });

  return NextResponse.json({ pending: true, adminPhone: admin?.phone ?? null });
}

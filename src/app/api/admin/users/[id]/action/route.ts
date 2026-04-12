import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await req.json(); // "activate" | "deactivate" | "approve"

  if (!["activate", "deactivate", "approve"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const isActive = action === "activate" || action === "approve";

  const user = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return NextResponse.json(user);
}

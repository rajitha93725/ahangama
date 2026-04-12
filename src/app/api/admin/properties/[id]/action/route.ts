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
  const { action } = await req.json(); // "approve" | "reject" | "activate" | "deactivate" | "suspend"

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

  const property = await prisma.property.update({
    where: { id },
    data: { status: statusMap[action] },
    select: { id: true, title: true, status: true, hostId: true },
  });

  return NextResponse.json(property);
}

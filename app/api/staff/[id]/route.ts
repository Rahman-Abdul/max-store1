import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ROOT_SUPER_ADMIN") return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { status, role, name, phone } = body;

  const updated = await prisma.user.update({
    where: { id },
    data: { ...(status && { status }), ...(role && { role }), ...(name && { name }), ...(phone !== undefined && { phone }) },
    select: { id: true, name: true, email: true, role: true, status: true, phone: true },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ROOT_SUPER_ADMIN") return NextResponse.json({ error: "Only Root Super Admin can delete users" }, { status: 403 });

  const { id } = await params;
  if (id === user.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  // Soft delete — set INACTIVE to preserve audit history
  await prisma.user.update({ where: { id }, data: { status: "INACTIVE" } });

  return NextResponse.json({ success: true });
}

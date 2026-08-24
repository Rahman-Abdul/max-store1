import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const { amount, reason, refundMethod } = await request.json();

  const refund = await prisma.refund.findUnique({ where: { id } });
  if (!refund) return NextResponse.json({ error: "Refund not found" }, { status: 404 });
  if (refund.status !== "PENDING")
    return NextResponse.json({ error: "Only pending refunds can be edited" }, { status: 400 });

  const updated = await prisma.refund.update({
    where: { id },
    data: {
      ...(amount       ? { amount }       : {}),
      ...(reason       ? { reason }       : {}),
      ...(refundMethod ? { refundMethod } : {}),
    },
  });
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;
  const refund = await prisma.refund.findUnique({ where: { id } });
  if (!refund) return NextResponse.json({ error: "Refund not found" }, { status: 404 });
  if (!["PENDING", "REJECTED"].includes(refund.status))
    return NextResponse.json({ error: "Only pending or rejected refunds can be deleted" }, { status: 400 });

  await prisma.refund.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

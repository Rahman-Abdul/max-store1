import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "CASHIER"].includes(user.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { id } = await params;

  const refund = await prisma.refund.findUnique({ where: { id } });
  if (!refund) return NextResponse.json({ error: "Refund not found" }, { status: 404 });
  if (refund.status !== "APPROVED") return NextResponse.json({ error: "Refund must be approved first" }, { status: 400 });

  const updated = await prisma.refund.update({
    where: { id },
    data:  { status: "COMPLETED", completedAt: new Date() },
  });

  // Update sale status to REFUNDED
  await prisma.sale.update({
    where: { id: refund.saleId },
    data:  { status: "REFUNDED", paymentStatus: "REFUNDED" },
  });

  return NextResponse.json({ success: true, data: updated });
}

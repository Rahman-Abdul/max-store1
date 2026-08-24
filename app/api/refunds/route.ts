import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const status = searchParams.get("status");
  const page   = parseInt(searchParams.get("page") || "1");
  const limit  = parseInt(searchParams.get("limit") || "20");
  const skip   = (page - 1) * limit;

  const user = session.user as any;
  let where: any = {};

  if (user.role === "SHOP_ADMIN") {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (us) where.sale = { shopId: us.shopId };
  } else if (shopId) {
    where.sale = { shopId };
  }

  if (status) where.status = status;

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      include: {
        sale: {
          select: {
            id: true, orderCode: true, totalAmount: true,
            shop: { select: { name: true } },
          },
        },
        requestedBy: { select: { id: true, name: true } },
        approvedBy:  { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip, take: limit,
    }),
    prisma.refund.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: refunds,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role))
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });

  const { refundId, action, notes } = await request.json();
  const status = action === "approve" ? "APPROVED" : "REJECTED";

  const refund = await prisma.refund.update({
    where: { id: refundId },
    data:  { status, approvedById: user.id, approvedAt: new Date(), notes },
  });

  return NextResponse.json({ success: true, data: refund });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { saleId, amount, reason, refundMethod, notes } = await request.json();

  if (!saleId || !amount || !reason)
    return NextResponse.json({ error: "saleId, amount, and reason are required" }, { status: 400 });

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { refunds: { where: { status: "COMPLETED" } } },
  });
  if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  if (sale.status !== "COMPLETED")
    return NextResponse.json({ error: "Only completed sales can be refunded" }, { status: 400 });

  const totalRefunded = sale.refunds.reduce((s: number, r: any) => s + Number(r.amount), 0);
  if (totalRefunded + amount > Number(sale.totalAmount)) {
    return NextResponse.json({ error: "Refund exceeds sale total" }, { status: 400 });
  }

  const refund = await prisma.refund.create({
    data: {
      saleId, requestedById: user.id, amount, reason,
      refundMethod, notes, status: "PENDING",
    },
  });

  return NextResponse.json({ success: true, data: refund });
}

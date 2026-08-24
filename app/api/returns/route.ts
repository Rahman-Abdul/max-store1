import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page   = parseInt(searchParams.get("page") || "1");
  const limit  = parseInt(searchParams.get("limit") || "20");
  const skip   = (page - 1) * limit;

  let baseWhere: any = {};
  if (user.role === "SHOP_ADMIN") {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (us) baseWhere.sale = { shopId: us.shopId };
  }

  // Where for filtered list
  const listWhere = status ? { ...baseWhere, status } : baseWhere;

  const [returns, total, pendingCount, rejectedCount, restockedCount] = await Promise.all([
    prisma.return.findMany({
      where: listWhere,
      include: {
        sale: {
          select: {
            id: true, orderCode: true, shopId: true,
            shop:  { select: { id: true, name: true } },
            staff: { select: { id: true, name: true } },
            items: {
              select: {
                id: true, productId: true, productName: true,
                productSku: true, quantity: true, sellingPrice: true, costPrice: true,
              },
            },
          },
        },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip, take: limit,
    }),
    prisma.return.count({ where: listWhere }),
    // Always fetch these counts regardless of current filter, for the summary cards
    prisma.return.count({ where: { ...baseWhere, status: "PENDING" } }),
    prisma.return.count({ where: { ...baseWhere, status: "REJECTED" } }),
    prisma.return.count({ where: { ...baseWhere, status: "RESTOCKED" } }),
  ]);

  return NextResponse.json({
    success: true,
    data: returns,
    stats: { pending: pendingCount, rejected: rejectedCount, restocked: restockedCount },
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { saleId, reason, notes, items } = await request.json();
  if (!saleId || !reason || !items?.length)
    return NextResponse.json({ error: "saleId, reason, and items required" }, { status: 400 });

  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  if (sale.status !== "COMPLETED")
    return NextResponse.json({ error: "Only completed sales can be returned" }, { status: 400 });

  const returnRecord = await prisma.return.create({
    data: {
      saleId, reason, notes, status: "PENDING",
      items: {
        create: items.map((i: any) => ({
          productId: i.productId,
          quantity:  i.quantity,
          reason:    i.reason || reason,
        })),
      },
    },
    include: { items: true },
  });
  return NextResponse.json({ success: true, data: returnRecord });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, reason, notes, items } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.return.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Return not found" }, { status: 404 });
  if (existing.status !== "PENDING")
    return NextResponse.json({ error: "Only pending returns can be edited" }, { status: 400 });

  await prisma.returnItem.deleteMany({ where: { returnId: id } });
  const updated = await prisma.return.update({
    where: { id },
    data: {
      reason, notes,
      items: {
        create: items.map((i: any) => ({
          productId: i.productId,
          quantity:  i.quantity,
          reason,
        })),
      },
    },
    include: { items: true },
  });
  return NextResponse.json({ success: true, data: updated });
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { serializeData } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const page   = parseInt(searchParams.get("page")  || "1",  10);
  const limit  = parseInt(searchParams.get("limit") || "20", 10);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const type   = searchParams.get("type")   || ""; // sale|return|refund|exchange|damage

  // Build shop filter based on role
  let shopIds: string[] = [];
  let shopWhere: any = {};

  if (user.role === "STAFF") {
    shopWhere.staffId = user.id;
  } else if (user.role !== "ROOT_SUPER_ADMIN") {
    const userShops = await prisma.userShop.findMany({
      where:  { userId: user.id },
      select: { shopId: true },
    });
    shopIds = userShops.map((s: any) => s.shopId);
    if (shopIds.length > 0) shopWhere.shopId = { in: shopIds };
  }

  // ── Sales ──────────────────────────────────────────────────────
  const saleWhere: any = {
    ...shopWhere,
    ...(status ? { status: { in: status.split(",") } } : { status: { in: ["COMPLETED", "CONFIRMED"] } }),
  };
  if (search.trim()) {
    saleWhere.OR = [
      { orderCode:    { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customer:     { name: { contains: search, mode: "insensitive" } } },
      { receipt:      { receiptNo: { contains: search, mode: "insensitive" } } },
    ];
  }

  // ── Parallel fetch all activity types ─────────────────────────
  const [sales, returns, refunds, swaps, damaged] = await Promise.all([
    (!type || type === "sale") ? prisma.sale.findMany({
      where: saleWhere,
      include: {
        items:    { include: { product: { select: { id: true, name: true, sku: true } } } },
        staff:    { select: { id: true, name: true } },
        cashier:  { select: { id: true, name: true } },
        customer: true,
        shop:     { select: { id: true, name: true, address: true, phone: true } },
        payments: { select: { id: true, method: true, amount: true, reference: true } },
        receipt:  true,
        refunds:  { select: { id: true, status: true, amount: true } },
        returns:  { select: { id: true, status: true } },
        swaps:    { select: { id: true } },
      },
      orderBy: [{ confirmedAt: "desc" }, { createdAt: "desc" }],
      skip:  (page - 1) * limit,
      take:  limit,
    }) : Promise.resolve([]),

    (!type || type === "return") ? prisma.return.findMany({
      where: {
        ...(shopIds.length ? { sale: { shopId: { in: shopIds } } } : {}),
        ...(search ? { sale: { orderCode: { contains: search, mode: "insensitive" } } } : {}),
      },
      include: {
        sale:  { select: { id: true, orderCode: true, shopId: true, shop: { select: { name: true } } } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }) : Promise.resolve([]),

    (!type || type === "refund") ? prisma.refund.findMany({
      where: {
        ...(shopIds.length ? { sale: { shopId: { in: shopIds } } } : {}),
        ...(search ? { sale: { orderCode: { contains: search, mode: "insensitive" } } } : {}),
      },
      include: {
        sale:        { select: { id: true, orderCode: true, shop: { select: { name: true } } } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy:  { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }) : Promise.resolve([]),

    (!type || type === "exchange") ? prisma.productSwap.findMany({
      where: {
        ...(shopIds.length ? { sale: { shopId: { in: shopIds } } } : {}),
        ...(search ? { sale: { orderCode: { contains: search, mode: "insensitive" } } } : {}),
      },
      include: {
        sale: { select: { id: true, orderCode: true, shop: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }) : Promise.resolve([]),

    (!type || type === "damage") ? prisma.damagedProduct.findMany({
      where: {
        ...(shopIds.length ? { shopId: { in: shopIds } } : {}),
        ...(search ? { product: { name: { contains: search, mode: "insensitive" } } } : {}),
      },
      include: {
        product:    { select: { id: true, name: true, sku: true } },
        reportedBy: { select: { id: true, name: true } },
        shop:       { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }) : Promise.resolve([]),
  ]);

  // Enrich swaps with product names
  const enrichedSwaps = await Promise.all((swaps as any[]).map(async (swap) => {
    const [orig, newProd] = await Promise.all([
      prisma.product.findUnique({ where: { id: swap.originalProductId }, select: { name: true, sku: true } }),
      prisma.product.findUnique({ where: { id: swap.newProductId },      select: { name: true, sku: true } }),
    ]);
    return { ...swap, originalProduct: orig, newProduct: newProd };
  }));

  // ── Normalise into unified activity feed ──────────────────────
  const activities = [
    ...(sales as any[]).map(s => ({
      id:        s.id,
      type:      "sale",
      date:      s.confirmedAt || s.createdAt,
      orderCode: s.orderCode,
      shopName:  s.shop?.name,
      amount:    Number(s.totalAmount),
      status:    s.status,
      data:      s,
    })),
    ...(returns as any[]).map(r => ({
      id:        r.id,
      type:      "return",
      date:      r.createdAt,
      orderCode: r.sale?.orderCode,
      shopName:  r.sale?.shop?.name,
      amount:    0,
      status:    r.status,
      data:      r,
    })),
    ...(refunds as any[]).map(r => ({
      id:        r.id,
      type:      "refund",
      date:      r.createdAt,
      orderCode: r.sale?.orderCode,
      shopName:  r.sale?.shop?.name,
      amount:    Number(r.amount),
      status:    r.status,
      data:      r,
    })),
    ...enrichedSwaps.map((s: any) => ({
      id:        s.id,
      type:      "exchange",
      date:      s.createdAt,
      orderCode: s.sale?.orderCode,
      shopName:  s.sale?.shop?.name,
      amount:    Number(s.priceDifference),
      status:    "COMPLETED",
      data:      s,
    })),
    ...(damaged as any[]).map(d => ({
      id:        d.id,
      type:      "damage",
      date:      d.createdAt,
      orderCode: null,
      shopName:  d.shop?.name,
      amount:    -Number(d.costLoss),
      status:    "RECORDED",
      data:      d,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = activities.length;

  return NextResponse.json({
    success: true,
    data:    serializeData(activities),
    meta:    { total, page, limit, pages: Math.ceil(total / limit) },
  });
}

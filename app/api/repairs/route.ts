import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { generateOrderCode } from "@/lib/utils";

// ─── Serialiser (handles Decimal / BigInt from Prisma) ────────────────────────
function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, v) => {
      if (v !== null && typeof v === "object" && typeof v.toNumber === "function")
        return v.toNumber();
      if (typeof v === "bigint") return Number(v);
      return v;
    })
  );
}

// ─── GET /api/repairs ─────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status");

  const where: any = {};

  if (["SHOP_ADMIN", "STAFF", "CASHIER"].includes(user.role)) {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (us) where.shopId = us.shopId;
  }
  if (user.role === "STAFF") where.staffId = user.id;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { orderCode:    { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { deviceType:   { contains: search, mode: "insensitive" } },
    ];
  }

  const repairs = await prisma.repair.findMany({
    where,
    include: {
      staff:     { select: { id: true, name: true } },
      cashier:   { select: { id: true, name: true } },
      partsUsed: true,
      shop:      { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: serialize(repairs) });
}

// ─── POST /api/repairs ────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    customerName, customerPhone, engineerName, deviceType, deviceModel,
    issueDesc, repairNotes, laborCost, paymentMethod,
    parts = [],
  } = body;

  // ── Resolve shop ─────────────────────────────────────────────────────────
  const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
  if (!us?.shopId) return NextResponse.json({ error: "No shop assigned" }, { status: 400 });
  const { shopId } = us;

  // ── Validate & check stock for product-linked parts only ─────────────────
  const productParts: any[] = parts.filter((p: any) => p.productId);

  if (productParts.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: productParts.map((p: any) => p.productId) } },
    });

    for (const part of productParts) {
      const product = products.find((p) => p.id === part.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${part.name}` },
          { status: 400 }
        );
      }

      const available: number = Number(product.stockQuantity) ?? 0;
      if (available < Number(part.quantity)) {
        return NextResponse.json(
          {
            error: `Insufficient stock for "${product.name}". Available: ${available}, requested: ${part.quantity}`,
          },
          { status: 400 }
        );
      }
    }
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalPartsCost = parts.reduce(
    (s: number, p: any) => s + (Number(p.chargePrice) || 0) * (Number(p.quantity) || 1),
    0
  );
  const totalAmount = totalPartsCost + (Number(laborCost) || 0);
  const orderCode   = generateOrderCode();

  // ── Transaction: create repair + decrement stock atomically ──────────────
  const repair = await prisma.$transaction(async (tx) => {
    const created = await tx.repair.create({
      data: {
        orderCode,
        shopId,
        staffId:       user.id,
        engineerName:  engineerName  || null,
        customerName,
        customerPhone: customerPhone  || null,
        deviceType,
        deviceModel:   deviceModel    || null,
        issueDesc,
        repairNotes:   repairNotes    || null,
        laborCost:     Number(laborCost) || 0,
        totalPartsCost,
        totalAmount,
        paymentMethod: paymentMethod  || "CASH",
        partsUsed: {
          create: parts.map((p: any) => ({
            name:        p.name,
            quantity:    Number(p.quantity)    || 1,
            unitCost:    Number(p.unitCost)    || 0,
            chargePrice: Number(p.chargePrice) || 0,
            totalCost:   (Number(p.chargePrice) || 0) * (Number(p.quantity) || 1),
            productId:   p.productId || null,
            // Only persisted for manual/outside parts; null for shop inventory parts
            shopName:    p.shopName  || null,
            shopOwner:   p.shopOwner || null,
          })),
        },
      },
      include: {
        partsUsed: true,
        shop:      { select: { id: true, name: true } },
      },
    });

    // Decrement stock for product-linked parts only
    const STOCK_FIELD = "stockQuantity";
    for (const part of productParts) {
      await tx.product.update({
        where: { id: part.productId },
        data:  { [STOCK_FIELD]: { decrement: Number(part.quantity) || 1 } } as any,
      });
    }

    return created;
  });

  return NextResponse.json({ success: true, data: serialize(repair) });
}

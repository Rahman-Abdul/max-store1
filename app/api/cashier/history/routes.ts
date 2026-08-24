import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const page   = parseInt(searchParams.get("page")  || "1",  10);
  const limit  = parseInt(searchParams.get("limit") || "20", 10);
  const search = searchParams.get("search") || "";

  // Get all shops this user belongs to
  const userShops = await prisma.userShop.findMany({
    where: { userId: user.id },
    select: { shopId: true },
  });
  const shopIds = userShops.map(s => s.shopId);

  // RSA sees all shops; others see only their assigned shops
  const shopFilter = user.role === "ROOT_SUPER_ADMIN"
    ? {}
    : shopIds.length > 0
    ? { shopId: { in: shopIds } }
    : {};

  const where: any = {
    status: { in: ["COMPLETED", "CONFIRMED"] },
    ...shopFilter,
  };

  if (search.trim()) {
    where.OR = [
      { orderCode:    { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customer:     { name: { contains: search, mode: "insensitive" } } },
      { receipt:      { receiptNo: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        staff:    { select: { id: true, name: true } },
        cashier:  { select: { id: true, name: true } },
        customer: true,
        shop:     { select: { id: true, name: true, address: true, phone: true } },
        payments: { select: { id: true, method: true, amount: true, reference: true } },
        receipt:  true,
      },
      orderBy: { confirmedAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: sales,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}

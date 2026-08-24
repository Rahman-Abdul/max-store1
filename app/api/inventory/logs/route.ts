import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId");
  const productId = searchParams.get("productId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");
  const skip = (page - 1) * limit;

  let where: any = {};

  // Shop admins can only see their own shop's logs
  if (user.role === "SHOP_ADMIN") {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (userShop) where.shopId = userShop.shopId;
  } else if (shopId) {
    where.shopId = shopId;
  }

  if (productId) where.productId = productId;

  const [logs, total] = await Promise.all([
    prisma.inventoryLog.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.inventoryLog.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

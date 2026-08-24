import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const type  = searchParams.get("type");
  const page  = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip  = (page - 1) * limit;

  let where: any = {};
  if (user.role === "SHOP_ADMIN") {
    const us = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (us) where.shopId = us.shopId;
  }
  if (type) where.damageType = type;

  const [records, total] = await Promise.all([
    prisma.damagedProduct.findMany({
      where,
      include: {
        product:    { select: { id: true, name: true, sku: true } },
        reportedBy: { select: { id: true, name: true } },
        shop:       { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip, take: limit,
    }),
    prisma.damagedProduct.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: records, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } });
}

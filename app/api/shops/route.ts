import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;

  const shopWhere = user.role === "ROOT_SUPER_ADMIN"
    ? {}
    : { users: { some: { userId: user.id } } };

  const shops = await prisma.shop.findMany({
    where: shopWhere,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          // Only active products
          products: { where: { isActive: true } },
          // Only completed/confirmed sales
          sales:    { where: { status: { in: ["COMPLETED", "CONFIRMED"] } } },
          users:    true,
        },
      },
      // Pull sales amounts for revenue + profit aggregation
      sales: {
        where: { status: { in: ["COMPLETED", "CONFIRMED"] } },
        select: { totalAmount: true, totalProfit: true },
      },
    },
  });

  const enriched = shops.map(shop => {
    const totalRevenue = shop.sales.reduce((s, sale) => s + Number(sale.totalAmount), 0);
    const totalProfit  = shop.sales.reduce((s, sale) => s + Number(sale.totalProfit), 0);
    // Don't expose the raw sales array to the client
    const { sales, ...rest } = shop;
    return {
      ...rest,
      totalRevenue,
      totalProfit,
    };
  });

  return NextResponse.json({ success: true, data: enriched });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "ROOT_SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, address, phone, email, currency = "NGN" } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").trim();

  try {
    const shop = await prisma.shop.create({
      data: { name, slug: `${slug}-${Date.now()}`, description, address, phone, email, currency },
    });
    return NextResponse.json({ success: true, data: shop });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (user.role !== "ROOT_SUPER_ADMIN")
    return NextResponse.json({ error: "Only Root Super Admin can delete shops" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("id");
  if (!shopId) return NextResponse.json({ error: "Shop ID required" }, { status: 400 });

  // Soft delete — deactivate instead of hard delete to preserve history
  await prisma.shop.update({ where: { id: shopId }, data: { status: "INACTIVE" } });

  return NextResponse.json({ success: true });
}

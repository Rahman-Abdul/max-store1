import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  let shopFilter: any = {};
  if (user.role === "SHOP_ADMIN" || user.role === "STAFF" || user.role === "CASHIER") {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (userShop) shopFilter = { shopId: userShop.shopId };
  }

  let where: any = { ...shopFilter };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        debts: {
          where: { isPaid: false },
          select: { id: true, balance: true, sale: { select: { orderCode: true } } },
        },
        _count: { select: { sales: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: customers,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await request.json();

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let shopId = body.shopId;
  if (!shopId) {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    shopId = userShop?.shopId;
  }

  if (!shopId) return NextResponse.json({ error: "No shop found" }, { status: 400 });
  if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  try {
    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        buyerType: body.buyerType || "REGULAR_BUYER",
        shopId,
      },
    });
    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

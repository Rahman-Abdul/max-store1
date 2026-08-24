import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET latest exchange rates
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rates = await prisma.exchangeRate.findMany({
    include: {
      baseCurrency: true,
      targetCurrency: true,
    },
    orderBy: { fetchedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    success: true,
    data: rates,
  });
}

// CREATE exchange rate
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;

  if (user.role !== "ROOT_SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { baseCurrencyId, targetCurrencyId, rate } = body;

  if (!baseCurrencyId || !targetCurrencyId || !rate) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const exchangeRate = await prisma.exchangeRate.create({
    data: {
      baseCurrencyId,
      targetCurrencyId,
      rate,
    },
    include: {
      baseCurrency: true,
      targetCurrency: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: exchangeRate,
  });
}

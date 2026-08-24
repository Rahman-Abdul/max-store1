import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId");
    const customerId = searchParams.get("customerId");

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    let where: any = {
      balance: { gt: 0 },
    };

    if (customerId) where.customerId = customerId;
    if (shopId) where.sale = { shopId };

    const [debts, total] = await Promise.all([
      prisma.debt.findMany({
        where,
        include: {
          customer: true,
          sale: {
            select: {
              id: true,
              orderCode: true,
              totalAmount: true,
              createdAt: true,
            },
          },
          payments: {
            orderBy: {
              paidAt: "desc", // ✅ FIXED HERE
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),

      prisma.debt.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: debts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET_DEBTS_ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { debtId, amount, method, reference, notes } = body;

    if (!debtId || !amount || !method) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const debt = await prisma.debt.findUnique({
      where: { id: debtId },
      include: { customer: true },
    });

    if (!debt) {
      return NextResponse.json(
        { error: "Debt not found" },
        { status: 404 }
      );
    }

    const payAmount = Math.min(
      Number(amount),
      Number(debt.balance)
    );

    await prisma.$transaction(async (tx) => {
      // CREATE PAYMENT
      await tx.debtPayment.create({
        data: {
          debtId,
          customerId: debt.customerId,
          amount: payAmount,
          method,
          reference,
          notes,
        },
      });

      // UPDATE DEBT BALANCE
      const newBalance =
        Number(debt.balance) - payAmount;

      await tx.debt.update({
        where: { id: debtId },
        data: {
          balance: newBalance,
          isPaid: newBalance <= 0,
        },
      });

      // UPDATE CUSTOMER DEBT BALANCE
      await tx.customer.update({
        where: { id: debt.customerId },
        data: {
          debtBalance: {
            decrement: payAmount,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
    });
  } catch (error) {
    console.error("DEBT_PAYMENT_ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

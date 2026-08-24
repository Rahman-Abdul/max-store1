"use server";
import { serializeData } from "@/lib/utils";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { RefundStatus, PaymentMethod, ExpenseStatus } from "@prisma/client";

// ==================== REFUNDS ====================

export async function requestRefund(data: {
  saleId: string;
  amount: number;
  reason: string;
  refundMethod?: PaymentMethod;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: { refunds: true },
  });
  if (!sale) throw new Error("Sale not found");

  const totalRefunded = sale.refunds
    .filter((r) => r.status === "COMPLETED")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  if (totalRefunded + data.amount > Number(sale.totalAmount)) {
    throw new Error("Refund amount exceeds total sale amount");
  }

  const refund = await prisma.refund.create({
    data: {
      saleId: data.saleId,
      requestedById: user.id,
      amount: data.amount,
      reason: data.reason,
      refundMethod: data.refundMethod,
      notes: data.notes,
      status: RefundStatus.PENDING,
    },
  });

  revalidatePath("/dashboard/refunds");
  return { success: true, data: serializeData(refund ) };
}

export async function approveRefund(refundId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    throw new Error("Insufficient permissions to approve refunds");
  }

  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { sale: true },
  });
  if (!refund) throw new Error("Refund not found");

  await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: RefundStatus.APPROVED,
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/refunds");
  return { success: true };
}

export async function completeRefund(refundId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "CASHIER"].includes(user.role)) {
    throw new Error("Insufficient permissions");
  }

  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { sale: true },
  });
  if (!refund) throw new Error("Refund not found");
  if (refund.status !== "APPROVED") throw new Error("Refund must be approved first");

  await prisma.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.COMPLETED, completedAt: new Date() },
    });

    // Update sale status
    await tx.sale.update({
      where: { id: refund.saleId },
      data: { status: "PARTIAL_REFUND" },
    });
  });

  revalidatePath("/dashboard/refunds");
  return { success: true };
}

export async function rejectRefund(refundId: string, reason: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    throw new Error("Insufficient permissions");
  }

  await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: RefundStatus.REJECTED,
      approvedById: user.id,
      notes: reason,
    },
  });

  revalidatePath("/dashboard/refunds");
  return { success: true };
}

export async function getRefunds(params: {
  shopId?: string;
  status?: RefundStatus;
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  let where: any = {};
  if (params.status) where.status = params.status;

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      where,
      include: {
        sale: { include: { shop: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.refund.count({ where }),
  ]);

  return {
    success: true,
    data: refunds,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ==================== RETURNS ====================

export async function createReturn(data: {
  saleId: string;
  reason: string;
  notes?: string;
  items: { productId: string; quantity: number; reason?: string }[];
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: { items: true },
  });
  if (!sale) throw new Error("Sale not found");

  const returnRecord = await prisma.$transaction(async (tx) => {
    const newReturn = await tx.return.create({
      data: {
        saleId: data.saleId,
        reason: data.reason,
        notes: data.notes,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            reason: item.reason,
          })),
        },
      },
      include: { items: true },
    });

    return newReturn;
  });

  revalidatePath("/dashboard/refunds");
  return { success: true, data: serializeData(returnRecord ) };
}

export async function approveReturn(returnId: string, restock: boolean = true) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    throw new Error("Insufficient permissions");
  }

  const returnRecord = await prisma.return.findUnique({
    where: { id: returnId },
    include: { items: { include: { product: true } }, sale: true },
  });
  if (!returnRecord) throw new Error("Return not found");

  await prisma.$transaction(async (tx) => {
    await tx.return.update({
      where: { id: returnId },
      data: { status: "APPROVED", restocked: restock },
    });

    if (restock) {
      for (const item of returnRecord.items) {
        const before = item.product.stockQuantity;
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            shopId: returnRecord.sale.shopId,
            userId: user.id,
            type: "RETURN",
            quantityBefore: before,
            quantityChange: item.quantity,
            quantityAfter: before + item.quantity,
            reference: returnRecord.saleId,
          },
        });
      }
    }
  });

  revalidatePath("/dashboard/refunds");
  return { success: true };
}

// ==================== EXPENSES ====================

export async function createExpense(data: {
  shopId: string;
  categoryId: string;
  title: string;
  description?: string;
  amount: number;
  expenseDate: Date;
  receipt?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    throw new Error("Insufficient permissions");
  }

  const expense = await prisma.expense.create({
    data: {
      ...data,
      createdById: user.id,
      status: ExpenseStatus.PENDING,
    },
  });

  revalidatePath("/dashboard/expenses");
  return { success: true, data: serializeData(expense ) };
}

export async function approveExpense(expenseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    throw new Error("Insufficient permissions");
  }

  await prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: ExpenseStatus.APPROVED,
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/expenses");
  return { success: true };
}

export async function getExpenses(params: {
  shopId?: string;
  categoryId?: string;
  status?: ExpenseStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  let where: any = {};
  if (user.role === "SHOP_ADMIN") {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (userShop) where.shopId = userShop.shopId;
  } else if (params.shopId) {
    where.shopId = params.shopId;
  }

  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.status) where.status = params.status;
  if (params.startDate || params.endDate) {
    where.expenseDate = {};
    if (params.startDate) where.expenseDate.gte = params.startDate;
    if (params.endDate) where.expenseDate.lte = params.endDate;
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        category: true,
        shop: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { expenseDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    success: true,
    data: expenses,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ==================== DEBTS ====================

export async function recordDebtPayment(data: {
  debtId: string;
  customerId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  const debt = await prisma.debt.findUnique({ where: { id: data.debtId } });
  if (!debt) throw new Error("Debt not found");

  const paymentAmount = Math.min(data.amount, Number(debt.balance));
  const newBalance = Number(debt.balance) - paymentAmount;

  await prisma.$transaction(async (tx) => {
    await tx.debtPayment.create({
      data: {
        debtId: data.debtId,
        customerId: data.customerId,
        amount: paymentAmount,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
      },
    });

    await tx.debt.update({
      where: { id: data.debtId },
      data: { balance: newBalance, isPaid: newBalance <= 0 },
    });

    await tx.customer.update({
      where: { id: data.customerId },
      data: { debtBalance: { decrement: paymentAmount } },
    });
  });

  revalidatePath("/dashboard/debts");
  return { success: true };
}

export async function getDebts(params: {
  shopId?: string;
  customerId?: string;
  isPaid?: boolean;
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  let where: any = {};
  if (params.customerId) where.customerId = params.customerId;
  if (params.isPaid !== undefined) where.isPaid = params.isPaid;

  const [debts, total] = await Promise.all([
    prisma.debt.findMany({
      where,
      include: {
        customer: true,
        sale: { select: { orderCode: true, createdAt: true } },
        payments: { orderBy: { paidAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.debt.count({ where }),
  ]);

  return {
    success: true,
    data: debts,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

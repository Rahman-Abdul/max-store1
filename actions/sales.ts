"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderCode, generateReceiptNo, serializeData } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { BuyerType, PaymentMethod, SaleStatus, PaymentStatus } from "@prisma/client";

interface SaleItem {
  productId: string;
  quantity: number;
  sellingPrice: number;
}

interface CreateSaleInput {
  shopId: string;
  buyerType: BuyerType;
  customerId?: string;
  customerName?: string;
  engineerName?: string;
  items: SaleItem[];
  discount?: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export async function createSale(input: CreateSaleInput) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "STAFF"].includes(user.role)) {
    throw new Error("Insufficient permissions");
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: input.items.map((i) => i.productId) },
      shopId: input.shopId,
    },
  });

  if (products.length !== input.items.length) {
    throw new Error("One or more products not found");
  }

  for (const item of input.items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`Product not found`);
    if (product.stockQuantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }
  }

  let subtotal = 0;
  let totalCost = 0;

  const saleItems = input.items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const costPrice = Number(product.costPrice);
    const totalItemCost = costPrice * item.quantity;
    const totalItemAmount = item.sellingPrice * item.quantity;
    const profit = totalItemAmount - totalItemCost;

    subtotal += totalItemAmount;
    totalCost += totalItemCost;

    return {
      productId: item.productId,
      productName: product.name,
      productSku: product.sku,
      quantity: item.quantity,
      costPrice,
      sellingPrice: item.sellingPrice,
      totalCost: totalItemCost,
      totalAmount: totalItemAmount,
      profit,
    };
  });

  const discount = input.discount || 0;
  const totalAmount = subtotal - discount;
  const totalProfit = totalAmount - totalCost;
  const orderCode = generateOrderCode();

  const sale = await prisma.$transaction(async (tx) => {
    const newSale = await tx.sale.create({
      data: {
        orderCode,
        shopId:        input.shopId,
        staffId:       user.id,
        customerId:    input.customerId   ?? null,
        customerName:  input.customerName?.trim() || null,
        engineerName:  input.engineerName?.trim() || null,
        buyerType:     input.buyerType,
        status:        SaleStatus.PENDING,
        subtotal,
        totalCost,
        totalProfit,
        discount,
        totalAmount,
        amountPaid:    0,
        balanceDue:    totalAmount,
        paymentMethod: input.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        notes:         input.notes ?? null,
        items: { create: saleItems },
      },
      include: {
        items: { include: { product: true } },
        staff: true,
        shop:  true,
      },
    });
    return newSale;
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/pos");

  return { success: true, data: serializeData(sale), orderCode };
}

export async function confirmSalePayment(
  saleId: string,
  amountPaid: number,
  paymentMethod?: string,
  paymentReference?: string,
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user = session.user as any;
  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "CASHIER"].includes(user.role)) {
    throw new Error("Only cashiers can confirm payments");
  }

  // Fetch sale with fresh product stock quantities
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, stockQuantity: true } },
        },
      },
      receipt: true, // check if receipt already exists
    },
  });

  if (!sale) throw new Error("Sale not found");
  if (sale.status === SaleStatus.COMPLETED) throw new Error("Sale already completed");
  if (sale.status === SaleStatus.CANCELLED)  throw new Error("Sale was cancelled");

  const totalAmount   = Number(sale.totalAmount);
  const isFullPayment = amountPaid >= totalAmount;
  const receiptNo     = generateReceiptNo();

  // ── Pre-fetch fresh stock quantities OUTSIDE transaction to avoid timeout ──
  const freshProducts = await prisma.product.findMany({
    where: { id: { in: sale.items.map(i => i.productId) } },
    select: { id: true, stockQuantity: true },
  });
  const stockMap = new Map(freshProducts.map(p => [p.id, p.stockQuantity]));

  // ── Build all inventory log data before entering transaction ──
  const inventoryLogs = sale.items.map(item => {
    const before   = stockMap.get(item.productId) ?? 0;
    const newStock = Math.max(0, before - item.quantity);
    return {
      productId:      item.productId,
      shopId:         sale.shopId,
      userId:         user.id,
      type:           "SALE",
      quantityBefore: before,
      quantityChange: -item.quantity,
      quantityAfter:  newStock,
      reference:      sale.orderCode,
    };
  });

  // ── For 50+ item sales: split stock updates into chunks of 25 ──
  // This prevents transaction timeout on very large sales
  const CHUNK_SIZE = 25;
  const itemChunks: typeof sale.items[] = [];
  for (let i = 0; i < sale.items.length; i += CHUNK_SIZE) {
    itemChunks.push(sale.items.slice(i, i + CHUNK_SIZE));
  }

  // ── Phase 1: Core transaction (sale status + payment + receipt) ──
  // Keep this lean so it always commits fast
  const updatedSale = await prisma.$transaction(async (tx) => {
    // 1. Update sale status
    const updated = await tx.sale.update({
      where: { id: saleId },
      data: {
        cashierId:     user.id,
        status:        isFullPayment ? SaleStatus.COMPLETED : SaleStatus.CONFIRMED,
        amountPaid,
        balanceDue:    Math.max(0, totalAmount - amountPaid),
        paymentStatus: isFullPayment ? PaymentStatus.COMPLETED : PaymentStatus.PARTIAL,
        confirmedAt:   new Date(),
        ...(paymentMethod && { paymentMethod: paymentMethod as PaymentMethod }),
      },
    });

    // 2. Record payment
    await tx.payment.create({
      data: {
        saleId,
        method:    (paymentMethod ?? sale.paymentMethod) as PaymentMethod,
        amount:    amountPaid,
        reference: paymentReference ?? null,
        status:    PaymentStatus.COMPLETED,
      },
    });

    // 3. Create receipt only if one doesn't already exist
    if (!sale.receipt) {
      await tx.receipt.create({
        data: { saleId, receiptNo },
      });
    }

    // 4. Handle partial payment debt
    if (!isFullPayment && sale.customerId) {
      const balanceDue = totalAmount - amountPaid;
      await tx.debt.create({
        data: {
          customerId: sale.customerId,
          saleId,
          amount:  balanceDue,
          balance: balanceDue,
        },
      });
      await tx.customer.update({
        where: { id: sale.customerId },
        data:  { debtBalance: { increment: balanceDue } },
      });
    }

    return updated;
  }, {
    timeout: 15000, // lean transaction — only critical writes
  });

  // ── Phase 2: Stock deduction in parallel chunks (outside main transaction) ──
  // Each chunk runs as its own small transaction so no single one times out
  for (const chunk of itemChunks) {
    await prisma.$transaction(
      chunk.map(item => {
        const before   = stockMap.get(item.productId) ?? 0;
        const newStock = Math.max(0, before - item.quantity);
        return prisma.product.update({
          where: { id: item.productId },
          data:  { stockQuantity: newStock },
        });
      })
    );
  }

  // ── Phase 3: Inventory logs in chunks of 50 (createMany is very fast) ──
  for (let i = 0; i < inventoryLogs.length; i += 50) {
    await prisma.inventoryLog.createMany({
      data: inventoryLogs.slice(i, i + 50),
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cashier");
  revalidatePath("/dashboard/sales");

  // Return the existing receiptNo if receipt already existed
  const finalReceiptNo = sale.receipt?.receiptNo ?? receiptNo;

  return { success: true, data: serializeData(updatedSale), receiptNo: finalReceiptNo };
}

export async function getSaleByOrderCode(orderCode: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const sale = await prisma.sale.findUnique({
    where: { orderCode },
    include: {
      items:    { include: { product: true } },
      staff:    { select: { id: true, name: true, username: true } },
      cashier:  { select: { id: true, name: true, username: true } },
      customer: true,
      shop:     true,
      payments: true,
      receipt:  true,
    },
  });

  return sale ? serializeData(sale) : null;
}

export async function getSalesHistory(params: {
  shopId?:    string;
  staffId?:   string;
  buyerType?: BuyerType;
  status?:    SaleStatus;
  startDate?: Date;
  endDate?:   Date;
  page?:      number;
  limit?:     number;
  search?:    string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const user  = session.user as any;
  const page  = params.page  ?? 1;
  const limit = params.limit ?? 20;
  const skip  = (page - 1) * limit;

  const where: any = {};

  if (user.role === "STAFF") {
    where.staffId = user.id;
  } else if (user.role === "SHOP_ADMIN") {
    const userShop = await prisma.userShop.findFirst({ where: { userId: user.id } });
    if (userShop) where.shopId = userShop.shopId;
  }

  if (params.shopId && user.role === "ROOT_SUPER_ADMIN") where.shopId   = params.shopId;
  if (params.staffId)   where.staffId   = params.staffId;
  if (params.buyerType) where.buyerType = params.buyerType;
  if (params.status)    where.status    = params.status;

  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) where.createdAt.gte = params.startDate;
    if (params.endDate)   where.createdAt.lte = params.endDate;
  }

  if (params.search) {
    where.OR = [
      { orderCode:    { contains: params.search, mode: "insensitive" } },
      { customerName: { contains: params.search, mode: "insensitive" } },
      { engineerName: { contains: params.search, mode: "insensitive" } },
      { customer: { name: { contains: params.search, mode: "insensitive" } } },
    ];
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        items:    { include: { product: true } },
        staff:    { select: { id: true, name: true } },
        cashier:  { select: { id: true, name: true } },
        customer: true,
        shop:     { select: { id: true, name: true } },
        receipt:  { select: { receiptNo: true } },
        payments: { select: { method: true, amount: true, reference: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    success:    true,
    data:       serializeData(sales),
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function cancelSale(saleId: string, reason: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as any;

  if (!["ROOT_SUPER_ADMIN", "SHOP_ADMIN"].includes(user.role)) {
    throw new Error("Insufficient permissions to cancel sale");
  }

  await prisma.sale.update({
    where: { id: saleId },
    data:  { status: SaleStatus.CANCELLED, notes: reason },
  });

  revalidatePath("/dashboard/sales");
  return { success: true };
}

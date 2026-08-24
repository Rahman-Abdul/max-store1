import { z } from "zod";

// ==================== USER VALIDATORS ====================

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  role: z.enum(["ROOT_SUPER_ADMIN", "SHOP_ADMIN", "STAFF", "CASHIER"]),
  shopIds: z.array(z.string()).min(1, "Assign at least one shop"),
  phone: z.string().optional(),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .extend({
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^a-zA-Z0-9]/)
      .optional()
      .or(z.literal("")),
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ==================== PRODUCT VALIDATORS ====================

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  costPrice: z.number().min(0, "Cost price must be 0 or greater"),
  stockQuantity: z.number().int().min(0, "Stock quantity must be 0 or greater"),
  lowStockThreshold: z.number().int().min(1, "Low stock threshold must be at least 1"),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  shopId: z.string().min(1, "Shop is required"),
});

export const updateProductSchema = createProductSchema.partial().extend({
  shopId: z.string().min(1, "Shop is required"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ==================== SALE VALIDATORS ====================

export const saleItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  sellingPrice: z.number().min(0, "Selling price must be 0 or greater"),
});

export const createSaleSchema = z.object({
  shopId: z.string().min(1, "Shop is required"),
  buyerType: z.enum(["ENGINEER", "REGULAR_BUYER", "WHOLESALER"]),
  customerId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
  discount: z.number().min(0).max(100).optional().default(0),
  paymentMethod: z.enum([
    "CASH",
    "BANK_TRANSFER",
    "POS_TERMINAL",
    "MOBILE_MONEY",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "WALLET",
    "SPLIT",
    "CREDIT",
  ]),
  notes: z.string().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

// ==================== CUSTOMER VALIDATORS ====================

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  shopId: z.string().min(1, "Shop is required"),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ==================== EXPENSE VALIDATORS ====================

export const createExpenseSchema = z.object({
  shopId: z.string().min(1, "Shop is required"),
  categoryId: z.string().min(1, "Category is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  expenseDate: z.coerce.date(),
  receipt: z.string().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

// ==================== REFUND VALIDATORS ====================

export const createRefundSchema = z.object({
  saleId: z.string().min(1, "Sale is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  reason: z.string().min(5, "Please provide a reason (at least 5 characters)"),
  refundMethod: z
    .enum([
      "CASH",
      "BANK_TRANSFER",
      "POS_TERMINAL",
      "MOBILE_MONEY",
      "CREDIT_CARD",
      "DEBIT_CARD",
      "WALLET",
      "SPLIT",
      "CREDIT",
    ])
    .optional(),
  notes: z.string().optional(),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;

// ==================== DEBT PAYMENT VALIDATORS ====================

export const createDebtPaymentSchema = z.object({
  debtId: z.string().min(1, "Debt ID is required"),
  customerId: z.string().min(1, "Customer is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum([
    "CASH",
    "BANK_TRANSFER",
    "POS_TERMINAL",
    "MOBILE_MONEY",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "WALLET",
    "SPLIT",
    "CREDIT",
  ]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateDebtPaymentInput = z.infer<typeof createDebtPaymentSchema>;

// ==================== RESTOCK VALIDATORS ====================

export const restockProductSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  costPrice: z.number().min(0, "Cost price must be 0 or greater"),
  supplierId: z.string().optional(),
  notes: z.string().optional(),
});

export type RestockProductInput = z.infer<typeof restockProductSchema>;

// ==================== DAMAGED PRODUCT VALIDATORS ====================

export const reportDamagedSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  shopId: z.string().min(1, "Shop is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  damageType: z.enum(["PHYSICAL", "EXPIRED", "DEFECTIVE", "SUPPLIER_ISSUE", "OTHER"]),
  notes: z.string().optional(),
});

export type ReportDamagedInput = z.infer<typeof reportDamagedSchema>;

// ==================== CLOSING REPORT VALIDATORS ====================

export const createClosingReportSchema = z.object({
  shopId: z.string().min(1, "Shop is required"),
  openingCash: z.number().min(0, "Opening cash must be 0 or greater"),
  closingCash: z.number().min(0, "Closing cash must be 0 or greater"),
  notes: z.string().optional(),
});

export type CreateClosingReportInput = z.infer<typeof createClosingReportSchema>;

// ==================== SHOP VALIDATORS ====================

export const createShopSchema = z.object({
  name: z.string().min(2, "Shop name must be at least 2 characters"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  currency: z.string().default("NGN"),
});

export const updateShopSchema = createShopSchema.partial();

export type CreateShopInput = z.infer<typeof createShopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;

// ==================== SETTINGS VALIDATORS ====================

export const updateSettingsSchema = z.object({
  shopName: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  currency: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  receiptFooter: z.string().optional(),
  lowStockAlert: z.number().int().min(1).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// ==================== PAGINATION VALIDATORS ====================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

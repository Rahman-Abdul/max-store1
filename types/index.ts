import {
  User,
  Shop,
  Product,
  Category,
  Sale,
  SaleItem,
  Customer,
  Expense,
  Debt,
  Refund,
  Return,
  DamagedProduct,
  Payment, // ✅ ADD THIS
  UserRole,
  BuyerType,
  PaymentMethod,
  SaleStatus,
  PaymentStatus,
} from "@prisma/client";

// ==================== EXTENDED TYPES ====================

export type UserWithShops = User & {
  shopAssignments: {
    shop: Shop;
  }[];
};

export type SaleWithDetails = Sale & {
  staff: User;
  cashier?: User | null;
  customer?: Customer | null;
  shop: Shop;
  items: (SaleItem & { product: Product })[];
  payments: Payment[];
  receipt?: {
    id: string;
    receiptNo: string;
    qrCode?: string | null;
  } | null;
};

export type ProductWithDetails = Product & {
  category?: Category | null;
  supplier?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  shop: Shop;
};

export type CustomerWithDebt = Customer & {
  debts: Debt[];
};

// ==================== DASHBOARD STATS ====================

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  pendingRefunds: number;
  totalDebts: number;
  salesGrowth: number;
  profitGrowth: number;
}

export interface ShopStats extends DashboardStats {
  shopId: string;
  shopName: string;
  todaySales: number;
  todayRevenue: number;
  weekSales: number;
  monthSales: number;
}

// ==================== POS TYPES ====================

export interface CartItem {
  productId: string;
  productName: string;
  productSku: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  image?: string | null;
  stockQuantity: number;
}

export interface Cart {
  items: CartItem[];
  buyerType: BuyerType;
  customerId?: string;
  discount: number;
  notes?: string;
  paymentMethod: PaymentMethod;
}

// ==================== FORM TYPES ====================

export interface CreateUserForm {
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  shopIds: string[];
  phone?: string;
}

export interface CreateProductForm {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  costPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  categoryId?: string;
  supplierId?: string;
  shopId: string;
}

export interface CreateSaleForm {
  shopId: string;
  buyerType: BuyerType;
  customerId?: string;
  items: {
    productId: string;
    quantity: number;
    sellingPrice: number;
  }[];
  discount?: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CreateExpenseForm {
  shopId: string;
  categoryId: string;
  title: string;
  description?: string;
  amount: number;
  expenseDate: Date;
  receipt?: string;
}

export interface CreateRefundForm {
  saleId: string;
  amount: number;
  reason: string;
  refundMethod?: PaymentMethod;
  notes?: string;
}

export interface CreateDebtPaymentForm {
  debtId: string;
  customerId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

// ==================== REPORT TYPES ====================

export interface SalesReport {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  byBuyerType: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageOrderValue: number;
  topProducts: string[];
}

export interface InventoryReport {
  productId: string;
  productName: string;
  openingStock: number;
  closingStock: number;
  sold: number;
  damaged: number;
  returned: number;
  restocked: number;
}

// ==================== ANALYTICS TYPES ====================

export interface AIInsight {
  type: string;
  title: string;
  description: string;
  data?: any;
  priority: "low" | "medium" | "high" | "critical";
}

export interface SalesTrend {
  period: string;
  revenue: number;
  profit: number;
  sales: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ==================== NOTIFICATION TYPES ====================

export interface PusherNotification {
  type: string;
  title: string;
  message: string;
  data?: any;
  shopId?: string;
  userId?: string;
}

// Re-export Prisma types needed elsewhere
export type {
  User,
  Shop,
  Product,
  Category,
  Sale,
  SaleItem,
  Customer,
  Expense,
  Debt,
  Refund,
  Return,
  DamagedProduct,
  UserRole,
  BuyerType,
  PaymentMethod,
  SaleStatus,
  PaymentStatus,
};

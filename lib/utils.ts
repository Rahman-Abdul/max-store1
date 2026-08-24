import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate unique order code
export function generateOrderCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1 to avoid confusion
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Generate receipt number
export function generateReceiptNo(): string {
  const date = format(new Date(), "yyyyMMdd");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RCT-${date}-${random}`;
}

// Format currency
export function formatCurrency(
  amount: number | string | undefined | null,
  currency: string = "NGN"
): string {
  const num = Number(amount ?? 0);
  const symbols: Record<string, string> = {
    NGN: "₦",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${num.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Format date
export function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  return format(new Date(date), "MMM dd, yyyy");
}

// Format datetime
export function formatDateTime(date: Date | string | null): string {
  if (!date) return "N/A";
  return format(new Date(date), "MMM dd, yyyy HH:mm");
}

// Format relative time
export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// Calculate profit
export function calculateProfit(
  sellingPrice: number,
  costPrice: number,
  quantity: number = 1
): { profit: number; margin: number; isLoss: boolean } {
  const totalRevenue = sellingPrice * quantity;
  const totalCost = costPrice * quantity;
  const profit = totalRevenue - totalCost;
  const margin = totalCost > 0 ? (profit / totalRevenue) * 100 : 0;
  return { profit, margin, isLoss: profit < 0 };
}

// Slugify
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Get initials
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Buyer type label
export function getBuyerTypeLabel(buyerType: string): string {
  const labels: Record<string, string> = {
    ENGINEER: "Engineer",
    REGULAR_BUYER: "Regular Buyer",
    WHOLESALER: "Wholesaler",
  };
  return labels[buyerType] || buyerType;
}

// Payment method label
export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: "Cash",
    BANK_TRANSFER: "Bank Transfer",
    POS_TERMINAL: "POS Terminal",
    MOBILE_MONEY: "Mobile Money",
    CREDIT_CARD: "Credit Card",
    DEBIT_CARD: "Debit Card",
    WALLET: "Wallet",
    SPLIT: "Split Payment",
    CREDIT: "Credit",
  };
  return labels[method] || method;
}

// Truncate text
export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

// Parse decimal safely
export function parseDecimal(value: any): number {
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return value.toNumber();
  }
  return Number(value ?? 0);
}

// Role colors
export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    ROOT_SUPER_ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    SHOP_ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    STAFF: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    CASHIER: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };
  return colors[role] || "bg-gray-100 text-gray-800";
}

// Status colors
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    SUSPENDED: "bg-red-100 text-red-800",
    INACTIVE: "bg-gray-100 text-gray-800",
    COMPLETED: "bg-green-100 text-green-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    CANCELLED: "bg-red-100 text-red-800",
    APPROVED: "bg-blue-100 text-blue-800",
    REJECTED: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Serialize Prisma Decimal/Date objects to plain JS for Client Component props
export function serializeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_, value) => {
    // Prisma Decimal
    if (value !== null && typeof value === "object" && typeof value.toNumber === "function") {
      return value.toNumber();
    }
    // BigInt
    if (typeof value === "bigint") return Number(value);
    return value;
  }));
}

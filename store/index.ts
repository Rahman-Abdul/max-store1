import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Cart } from "@/types";
import { BuyerType, PaymentMethod } from "@prisma/client";

// ==================== POS CART STORE ====================

interface POSStore {
  cart: Cart;
  selectedShopId: string | null;
  setSelectedShop: (shopId: string) => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateSellingPrice: (productId: string, price: number) => void;
  setBuyerType: (type: BuyerType) => void;
  setCustomer: (customerId: string | undefined) => void;
  setDiscount: (discount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;

  // Computed values
  getSubtotal: () => number;
  getTotalCost: () => number;
  getTotalProfit: () => number;
  getTotalAmount: () => number;
}

const defaultCart: Cart = {
  items: [],
  buyerType: BuyerType.REGULAR_BUYER,
  customerId: undefined,
  discount: 0,
  notes: undefined,
  paymentMethod: PaymentMethod.CASH,
};

export const usePOSStore = create<POSStore>()(
  persist(
    (set, get) => ({
      cart: defaultCart,
      selectedShopId: null,

      setSelectedShop: (shopId) => set({ selectedShopId: shopId }),

      addItem: (item) =>
        set((state) => {
          const existingIndex = state.cart.items.findIndex(
            (i) => i.productId === item.productId
          );
          if (existingIndex >= 0) {
            const updatedItems = [...state.cart.items];
            updatedItems[existingIndex].quantity += item.quantity;
            return { cart: { ...state.cart, items: updatedItems } };
          }
          return {
            cart: { ...state.cart, items: [...state.cart.items, item] },
          };
        }),

      removeItem: (productId) =>
        set((state) => ({
          cart: {
            ...state.cart,
            items: state.cart.items.filter((i) => i.productId !== productId),
          },
        })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          cart: {
            ...state.cart,
            items: state.cart.items.map((i) =>
              i.productId === productId ? { ...i, quantity } : i
            ),
          },
        })),

      updateSellingPrice: (productId, price) =>
        set((state) => ({
          cart: {
            ...state.cart,
            items: state.cart.items.map((i) =>
              i.productId === productId ? { ...i, sellingPrice: price } : i
            ),
          },
        })),

      setBuyerType: (type) =>
        set((state) => ({
          cart: { ...state.cart, buyerType: type },
        })),

      setCustomer: (customerId) =>
        set((state) => ({
          cart: { ...state.cart, customerId },
        })),

      setDiscount: (discount) =>
        set((state) => ({
          cart: { ...state.cart, discount },
        })),

      setPaymentMethod: (method) =>
        set((state) => ({
          cart: { ...state.cart, paymentMethod: method },
        })),

      setNotes: (notes) =>
        set((state) => ({
          cart: { ...state.cart, notes },
        })),

      clearCart: () => set({ cart: defaultCart }),

      getSubtotal: () => {
        const { cart } = get();
        return cart.items.reduce(
          (sum, item) => sum + item.sellingPrice * item.quantity,
          0
        );
      },

      getTotalCost: () => {
        const { cart } = get();
        return cart.items.reduce(
          (sum, item) => sum + item.costPrice * item.quantity,
          0
        );
      },

      getTotalProfit: () => {
        const { cart } = get();
        const subtotal = cart.items.reduce(
          (sum, item) => sum + item.sellingPrice * item.quantity,
          0
        );
        const cost = cart.items.reduce(
          (sum, item) => sum + item.costPrice * item.quantity,
          0
        );
        return subtotal - cost - cart.discount;
      },

      getTotalAmount: () => {
        const { cart } = get();
        const subtotal = cart.items.reduce(
          (sum, item) => sum + item.sellingPrice * item.quantity,
          0
        );
        return Math.max(0, subtotal - cart.discount);
      },
    }),
    { name: "pos-cart" }
  )
);

// ==================== APP UI STORE ====================

interface AppStore {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeShopId: string | null;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveShop: (shopId: string | null) => void;
  addNotification: (notification: any) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      activeShopId: null,
      notifications: [],

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setActiveShop: (shopId) => set({ activeShopId: shopId }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            { ...notification, read: false, createdAt: new Date().toISOString() },
            ...state.notifications.slice(0, 49),
          ],
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      clearNotifications: () => set({ notifications: [] }),
    }),
    { name: "app-state" }
  )
);

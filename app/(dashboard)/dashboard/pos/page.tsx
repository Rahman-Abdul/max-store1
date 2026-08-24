"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePOSStore } from "@/store";
import { getProducts } from "@/actions/inventory";
import { createSale } from "@/actions/sales";
import { formatCurrency, cn, getBuyerTypeLabel } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User, Package,
  Zap, X, AlertCircle, CheckCircle2, Tag, ScanLine,
  Loader2, DollarSign, Clock, Wrench, UserCircle, Building2, UserCheck
} from "lucide-react";
import { BuyerType } from "@prisma/client";
import { useSession } from "next-auth/react";

type EngineerType = "INTERNAL" | "EXTERNAL";

export default function POSPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const {
    cart, selectedShopId, addItem, removeItem, updateQuantity,
    updateSellingPrice, setBuyerType,
    setNotes, clearCart, getSubtotal, getTotalAmount, getTotalProfit, getTotalCost,
  } = usePOSStore();

  const [search, setSearch]             = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [orderResult, setOrderResult]   = useState<{ orderCode: string } | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput]     = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // ── Sale meta fields ────────────────────────────────────────────────────────
  const [customerName, setCustomerName]   = useState("");
  const [engineerType, setEngineerType]   = useState<EngineerType>("INTERNAL");
  const [engineerName, setEngineerName]   = useState("");
  const [saleStartedAt, setSaleStartedAt] = useState<Date | null>(null);
  const [now, setNow]                     = useState<Date | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // Start clock only after client mount — prevents SSR/client hydration mismatch
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Lock timestamp when first item lands in cart
  useEffect(() => {
    if (cart.items.length > 0 && !saleStartedAt) setSaleStartedAt(new Date());
    if (cart.items.length === 0)                  setSaleStartedAt(null);
  }, [cart.items.length]);

  // Engineer fields only shown / required when buyer type is ENGINEER
  const isEngineerSale = cart.buyerType === "ENGINEER";

  const shopId = selectedShopId || user?.shops?.[0]?.id;

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ["pos-products", shopId, search, activeCategory],
    queryFn: () =>
      getProducts({
        shopId,
        search:     search || undefined,
        categoryId: activeCategory !== "all" ? activeCategory : undefined,
        isActive:   true,
        limit:      50,
      }),
    enabled: !!shopId,
  });

  const products = productsData?.data || [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") { setEditingPrice(null); setOrderResult(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleAddProduct = (product: any) => {
    if (product.stockQuantity === 0) {
      toast.error("Out of stock", { description: product.name });
      return;
    }
    const costPrice = Number(product.costPrice);
    addItem({
      productId:     product.id,
      productName:   product.name,
      productSku:    product.sku,
      costPrice,
      sellingPrice:  costPrice,
      quantity:      1,
      image:         product.image,
      stockQuantity: product.stockQuantity,
    });
    toast.success(`Added ${product.name}`);
  };

  const handlePriceEdit = (productId: string, currentPrice: number) => {
    setEditingPrice(productId);
    setPriceInput(String(currentPrice));
  };

  const handlePriceSave = (productId: string) => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) { toast.error("Invalid price"); return; }
    updateSellingPrice(productId, price);
    setEditingPrice(null);
    setPriceInput("");
  };

  const resetSaleFields = () => {
    clearCart();
    setCustomerName("");
    setEngineerName("");
    setEngineerType("INTERNAL");
    setSaleStartedAt(null);
  };

  const handleSubmitSale = async () => {
    if (cart.items.length === 0) { toast.error("Cart is empty"); return; }

    // Customer name is required for every sale
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    // Engineer name only required when buyer type is ENGINEER
    if (isEngineerSale && !engineerName.trim()) {
      toast.error("Engineer name is required");
      return;
    }

    const zeroPriceItems = cart.items.filter((i) => i.sellingPrice <= 0);
    if (zeroPriceItems.length > 0) {
      toast.error("Please set selling price for all items", {
        description: zeroPriceItems.map((i) => i.productName).join(", "),
      });
      return;
    }
    if (!shopId) { toast.error("No shop selected"); return; }

    setSubmitting(true);
    try {
      const result = await createSale({
        shopId,
        buyerType:    cart.buyerType,
        customerId:   cart.customerId,
        customerName: customerName.trim(),
        // Only send engineerName for engineer sales, prefixed with type
        engineerName: isEngineerSale
          ? `[${engineerType}] ${engineerName.trim()}`
          : undefined,
        items: cart.items.map((i) => ({
          productId:    i.productId,
          quantity:     i.quantity,
          sellingPrice: i.sellingPrice,
        })),
        discount:      cart.discount,
        paymentMethod: cart.paymentMethod,
        notes:         cart.notes,
      });

      if (result.success) {
        setOrderResult({ orderCode: result.orderCode! });
        resetSaleFields();
        toast.success("Order created!", { description: `Order code: ${result.orderCode}` });
      }
    } catch (error: any) {
      toast.error("Failed to create order", { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal     = getSubtotal();
  const total        = getTotalAmount();
  const profit       = getTotalProfit();
  const profitMargin = subtotal > 0 ? (profit / subtotal) * 100 : 0;

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-NG", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

  // Checkout is blocked when required fields are missing
  const missingFields =
    !customerName.trim() ||
    (isEngineerSale && !engineerName.trim()) ||
    cart.items.some((i) => i.sellingPrice <= 0);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">

      {/* ── Order success modal ─────────────────────────────────────────────── */}
      {orderResult && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Order Created!</h2>
            <p className="text-muted-foreground text-sm mb-4">Share this code with the cashier</p>
            <div className="bg-muted rounded-xl p-4 mb-6">
              <p className="text-xs text-muted-foreground mb-1">Order Code</p>
              <p className="text-2xl font-bold tracking-wider text-primary">{orderResult.orderCode}</p>
            </div>
            <button
              onClick={() => setOrderResult(null)}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              New Sale
            </button>
          </div>
        </div>
      )}

      {/* ── Left: Product Grid ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search products by name, SKU, barcode... (press /)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <button className="p-2.5 border border-border rounded-xl hover:bg-muted transition-colors" title="Scan barcode">
            <ScanLine size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-32 skeleton rounded-xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Package size={48} className="mb-3 opacity-30" />
              <p className="text-sm">No products found</p>
              {search && (
                <button onClick={() => setSearch("")} className="text-xs text-primary mt-1 hover:underline">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((product: any) => {
                const inCart       = cart.items.find((i) => i.productId === product.id);
                const isOutOfStock = product.stockQuantity === 0;
                return (
                  <div key={product.id} className="relative group/card">
                    {["ROOT_SUPER_ADMIN","SHOP_ADMIN"].includes(user?.role) && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`Remove "${product.name}" from inventory?`)) return;
                          try {
                            const { deleteProduct } = await import("@/actions/inventory");
                            await deleteProduct(product.id);
                            toast.success(`${product.name} removed`);
                            refetch();
                          } catch { toast.error("Failed to remove"); }
                        }}
                        className="absolute -top-1.5 -right-1.5 z-20 w-5 h-5 bg-red-500 text-white rounded-full
                                   opacity-0 group-hover/card:opacity-100 flex items-center justify-center
                                   hover:bg-red-600 transition-all shadow-md"
                        title="Remove product"
                      >
                        <X size={10} />
                      </button>
                    )}
                    <button
                      onClick={() => handleAddProduct(product)}
                      disabled={isOutOfStock}
                      className={cn(
                        "relative w-full text-left p-3 rounded-xl border transition-all duration-150 group",
                        isOutOfStock
                          ? "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                          : inCart
                          ? "border-primary/50 bg-primary/5 shadow-md shadow-primary/10"
                          : "border-border bg-card hover:border-primary/30 hover:shadow-md active:scale-95"
                      )}
                    >
                      <div className="w-full aspect-square rounded-lg mb-2 flex items-center justify-center text-2xl bg-muted overflow-hidden">
                        {product.image
                          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          : <Package size={28} className="text-muted-foreground/40" />
                        }
                      </div>
                      <p className="text-xs font-semibold leading-tight line-clamp-2 mb-1">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          Stock: {isOutOfStock
                            ? <span className="text-red-500 font-medium">OUT</span>
                            : <span className={product.stockQuantity <= product.lowStockThreshold ? "text-amber-500 font-medium" : ""}>{product.stockQuantity}</span>
                          }
                        </span>
                        {inCart && (
                          <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium">
                            ×{inCart.quantity}
                          </span>
                        )}
                      </div>
                      {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50">
                          <span className="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-950 px-2 py-1 rounded-full">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart ─────────────────────────────────────────────────────── */}
      <div className="w-96 flex flex-col bg-card border border-border rounded-2xl overflow-hidden shrink-0 min-h-0">

        {/* Header + clock */}
        <div className="px-4 py-3 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-primary" />
              <span className="font-semibold text-sm">Cart</span>
              {cart.items.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                  {cart.items.length}
                </span>
              )}
            </div>
            {cart.items.length > 0 && (
              <button
                onClick={resetSaleFields}
                className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>
          {/* Timestamp */}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground bg-background/60 border border-border rounded-lg px-3 py-1.5">
            <Clock size={12} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              {saleStartedAt ? (
                <span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mr-1">Started</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatDate(saleStartedAt)} · {formatTime(saleStartedAt)}
                  </span>
                </span>
              ) : (
                <span className="tabular-nums font-semibold text-foreground">
                  {now ? `${formatDate(now)} · ${formatTime(now)}` : "—"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable: fields + cart items */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── Buyer type ──────────────────────────────────────────────────── */}
          <div className="px-4 pt-3 pb-2 border-b border-border">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Buyer Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["REGULAR_BUYER", "WHOLESALER", "ENGINEER"] as BuyerType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setBuyerType(type)}
                  className={cn(
                    "text-xs py-1.5 px-2 rounded-lg border font-medium transition-all",
                    cart.buyerType === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted"
                  )}
                >
                  {type === "REGULAR_BUYER" ? "Regular" : type === "WHOLESALER" ? "Wholesale" : "Engineer"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Customer name — required for ALL buyer types ─────────────────── */}
          <div className="px-4 pt-3 pb-2 border-b border-border">
            <label className="text-xs font-medium mb-1.5 flex items-center gap-1">
              <UserCircle size={12} className="text-primary" />
              {cart.buyerType === "WHOLESALER"
                ? "Business / Wholesaler Name"
                : cart.buyerType === "ENGINEER"
                ? "Engineer's Name"
                : "Customer Name"}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder={
                  cart.buyerType === "WHOLESALER"
                    ? "Business or wholesaler name"
                    : cart.buyerType === "ENGINEER"
                    ? "Engineer's full name"
                    : "Customer full name"
                }
                className={cn(
                  "w-full pl-8 pr-3 py-2 text-sm bg-background border rounded-xl transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                  !customerName.trim() ? "border-red-300 dark:border-red-800" : "border-border"
                )}
              />
            </div>
            {!customerName.trim() && (
              <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> Required for all sales
              </p>
            )}
          </div>

          {/* ── Engineer type + name — ONLY shown when buyer type is ENGINEER ── */}
          {isEngineerSale && (
            <div className="px-4 pt-3 pb-2 border-b border-border">
              <label className="text-xs font-medium mb-1.5 flex items-center gap-1">
                <Wrench size={12} className="text-primary" />
                Engineer Type
                <span className="text-red-500 ml-0.5">*</span>
              </label>

              {/* Internal / External toggle buttons */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {(["INTERNAL", "EXTERNAL"] as EngineerType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEngineerType(type)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 text-xs py-2 px-2 rounded-lg border font-medium transition-all",
                      engineerType === type
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/40 hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {type === "INTERNAL"
                      ? <><Building2 size={12} /> Internal</>
                      : <><UserCheck size={12} /> External</>
                    }
                  </button>
                ))}
              </div>

              {/* Engineer name input */}
              <div className="relative">
                <Wrench size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={engineerName}
                  onChange={e => setEngineerName(e.target.value)}
                  placeholder={
                    engineerType === "INTERNAL"
                      ? "In-house engineer name"
                      : "External / freelance engineer name"
                  }
                  className={cn(
                    "w-full pl-8 pr-3 py-2 text-sm bg-background border rounded-xl transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                    !engineerName.trim() ? "border-red-300 dark:border-red-800" : "border-border"
                  )}
                />
              </div>
              {!engineerName.trim() && (
                <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> Required for engineer sales
                </p>
              )}
            </div>
          )}

          {/* ── Cart items ───────────────────────────────────────────────────── */}
          <div className="px-3 py-3 space-y-2">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-muted-foreground">
                <ShoppingCart size={32} className="mb-2 opacity-30" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs mt-1">Click products to add them</p>
              </div>
            ) : (
              cart.items.map((item) => {
                const itemTotal  = item.sellingPrice * item.quantity;
                const itemProfit = (item.sellingPrice - item.costPrice) * item.quantity;
                const isEditing  = editingPrice === item.productId;

                return (
                  <div key={item.productId} className="bg-background border border-border rounded-xl p-3 space-y-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight line-clamp-2">{item.productName}</p>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-muted-foreground hover:text-red-500 transition-colors shrink-0 mt-0.5"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.productSku}</p>

                      {/* Selling price */}
                      <div className="mt-2">
                        <div className="flex items-center gap-1">
                          <Tag size={12} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Selling price:</span>
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="number"
                              value={priceInput}
                              onChange={(e) => setPriceInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handlePriceSave(item.productId);
                                if (e.key === "Escape") setEditingPrice(null);
                              }}
                              className="flex-1 text-sm border border-primary rounded-lg px-2 py-1 focus:outline-none bg-background"
                              autoFocus min="0"
                            />
                            <button
                              onClick={() => handlePriceSave(item.productId)}
                              className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePriceEdit(item.productId, item.sellingPrice)}
                            className={cn(
                              "mt-1 text-sm font-semibold px-2 py-0.5 rounded-lg border border-dashed transition-colors",
                              item.sellingPrice <= 0
                                ? "border-red-400 text-red-500 bg-red-50 dark:bg-red-950/20"
                                : "border-border hover:border-primary/50 hover:text-primary"
                            )}
                          >
                            {item.sellingPrice <= 0 ? "Set price →" : formatCurrency(item.sellingPrice)}
                          </button>
                        )}
                      </div>

                      {/* Profit */}
                      <div className="mt-2 flex items-center gap-2">
                        <DollarSign size={11} className="text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground">Profit ₦:</span>
                        {["ROOT_SUPER_ADMIN","SHOP_ADMIN","STAFF"].includes(user?.role) ? (
                          <input
                            type="number" min="0"
                            value={(() => {
                              const p = (item.sellingPrice - item.costPrice) * item.quantity;
                              return p > 0 ? p.toFixed(0) : "";
                            })()}
                            onChange={(e) => {
                              const profitAmt = parseFloat(e.target.value) || 0;
                              const newPrice  = item.costPrice + (profitAmt / item.quantity);
                              updateSellingPrice(item.productId, newPrice);
                            }}
                            placeholder="0"
                            className="flex-1 text-xs text-right border border-border rounded-lg px-2 py-0.5 bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 font-semibold text-emerald-600"
                          />
                        ) : (
                          <span className={cn(
                            "text-xs font-semibold ml-auto",
                            (item.sellingPrice - item.costPrice) * item.quantity >= 0 ? "text-emerald-600" : "text-red-500"
                          )}>
                            {formatCurrency((item.sellingPrice - item.costPrice) * item.quantity)}
                          </span>
                        )}
                        {item.costPrice > 0 && item.sellingPrice > 0 && (
                          <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                            ({((item.sellingPrice - item.costPrice) / item.costPrice * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>

                      {/* Qty controls */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (item.quantity <= 1) removeItem(item.productId);
                              else updateQuantity(item.productId, item.quantity - 1);
                            }}
                            className="w-6 h-6 rounded-md bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => {
                              if (item.quantity >= item.stockQuantity) {
                                toast.error("Cannot exceed available stock");
                                return;
                              }
                              updateQuantity(item.productId, item.quantity + 1);
                            }}
                            className="w-6 h-6 rounded-md bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(itemTotal)}</p>
                          {item.sellingPrice > 0 && (
                            <p className={cn("text-xs", itemProfit >= 0 ? "text-emerald-600" : "text-red-500")}>
                              {itemProfit >= 0 ? "+" : ""}{formatCurrency(itemProfit)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Totals + checkout — sticky bottom ──────────────────────────────── */}
        {cart.items.length > 0 && (
          <div className="border-t border-border px-4 py-4 space-y-3 bg-muted/20 shrink-0">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                <span>Total</span><span>{formatCurrency(total)}</span>
              </div>
              <div className={cn(
                "flex justify-between text-xs font-medium",
                profit >= 0 ? "text-emerald-600" : "text-red-500"
              )}>
                <span>Total Profit</span>
                <span>{formatCurrency(profit)} ({profitMargin.toFixed(1)}%)</span>
              </div>
            </div>

            <button
              onClick={handleSubmitSale}
              disabled={submitting || missingFields}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50
                         text-white font-bold rounded-xl transition-all duration-150
                         flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-600/20
                         active:scale-[0.98]"
            >
              {submitting
                ? <><Loader2 size={18} className="animate-spin" />Processing...</>
                : <><Zap size={18} />Create Order — {formatCurrency(total)}</>
              }
            </button>

            {missingFields && (
              <div className="space-y-0.5">
                {!customerName.trim() && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {cart.buyerType === "ENGINEER" ? "Engineer's name" : "Customer name"} is required
                  </p>
                )}
                {isEngineerSale && !engineerName.trim() && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} /> Engineer name is required
                  </p>
                )}
                {cart.items.some((i) => i.sellingPrice <= 0) && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle size={11} /> Set selling price for all items
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { usePOSStore } from "@/store";
import { createSale } from "@/actions/sales";
import {
  formatCurrency,
  cn,
} from "@/lib/utils";

import { toast } from "sonner";

import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Barcode,
  User,
  Tag,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  BuyerType,
  PaymentMethod,
} from "@prisma/client";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  costPrice: number;
  stockQuantity: number;
  category?: {
    name: string;
  } | null;
  image?: string | null;
}

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
}

interface Props {
  products: Product[];
  shopId: string;
  user: any;
  customers: Customer[];
}

type CreateSaleResponse =
  | {
      success: true;
      orderCode: string;
      data: any;
    }
  | {
      success: false;
      error: string;
    };

export function POSClient({
  products,
  shopId,
  user,
  customers,
}: Props) {
  const [search, setSearch] = useState("");
  const [customPrice, setCustomPrice] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    updateSellingPrice,
    setBuyerType,
    setCustomer,
    setDiscount,
    setPaymentMethod,
    setNotes,
    clearCart,
    getSubtotal,
    getTotalAmount,
    getTotalProfit,
  } = usePOSStore();

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filtered = products.filter((product) => {
    return (
      product.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      product.sku
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (product.barcode &&
        product.barcode.includes(search))
    );
  });

  const handleAddProduct = useCallback(
    (product: Product) => {
      if (product.stockQuantity <= 0) {
        toast.error("Out of stock");
        return;
      }

      const existing = cart.items.find(
        (item) => item.productId === product.id
      );

      if (
        existing &&
        existing.quantity >= product.stockQuantity
      ) {
        toast.error("Insufficient stock");
        return;
      }

      addItem({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.costPrice),
        quantity: 1,
        image: product.image ?? null,
        stockQuantity: product.stockQuantity,
      });

      toast.success(`${product.name} added`);
    },
    [cart.items, addItem]
  );

  const handlePriceChange = (
    productId: string,
    value: string
  ) => {
    setCustomPrice((prev) => ({
      ...prev,
      [productId]: value,
    }));

    const num = parseFloat(value);

    if (!isNaN(num) && num >= 0) {
      updateSellingPrice(productId, num);
    }
  };

  const handleSubmit = async () => {
    if (cart.items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const invalidPrices = cart.items.filter(
      (item) => item.sellingPrice <= 0
    );

    if (invalidPrices.length > 0) {
      toast.error(
        "All items must have a selling price"
      );
      return;
    }

    setLoading(true);

    try {
      const result =
        (await createSale({
          shopId,
          buyerType: cart.buyerType,
          customerId: cart.customerId,
          items: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
          })),
          discount: cart.discount,
          paymentMethod: cart.paymentMethod,
          notes: cart.notes,
        })) as CreateSaleResponse;

      if (result.success) {
        toast.success(
          `Order ${result.orderCode} created successfully`
        );

        clearCart();

        return;
      }

      toast.error(result.error);
    } catch (error) {
      console.error(error);

      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const subtotal = getSubtotal();
  const total = getTotalAmount();
  const profit = getTotalProfit();

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* LEFT */}
      <div className="flex-1 flex flex-col border-r border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

            <Input
              ref={searchRef}
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search products..."
              className="pl-9"
            />

            <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() =>
                  handleAddProduct(product)
                }
                disabled={
                  product.stockQuantity <= 0
                }
                className={cn(
                  "text-left p-3 rounded-xl border bg-card hover:border-primary hover:shadow-md transition-all",
                  product.stockQuantity <= 0 &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    {product.sku}
                  </span>

                  <Badge
                    variant={
                      product.stockQuantity <= 5
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-[10px]"
                  >
                    {product.stockQuantity <= 0
                      ? "OUT"
                      : product.stockQuantity}
                  </Badge>
                </div>

                <p className="text-sm font-semibold leading-tight mb-1">
                  {product.name}
                </p>

                {product.category && (
                  <p className="text-[10px] text-muted-foreground">
                    {product.category.name}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-1">
                  <Plus className="h-3 w-3 text-primary" />

                  <span className="text-xs text-primary font-medium">
                    Add
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-96 flex flex-col bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />

            <h2 className="font-semibold">
              Cart ({cart.items.length})
            </h2>
          </div>

          {cart.items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>

        {/* CART ITEMS */}
        <div className="flex-1 overflow-y-auto">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />

              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.productName}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {item.productSku}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        removeItem(item.productId)
                      }
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 border border-border rounded-lg">
                      <button
                        className="p-1.5 hover:bg-muted rounded-l-lg"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            Math.max(
                              1,
                              item.quantity - 1
                            )
                          )
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </button>

                      <span className="px-2 text-sm font-medium min-w-[2rem] text-center">
                        {item.quantity}
                      </span>

                      <button
                        className="p-1.5 hover:bg-muted rounded-r-lg"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            Math.min(
                              item.stockQuantity,
                              item.quantity + 1
                            )
                          )
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex-1">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Selling price"
                        value={
                          customPrice[
                            item.productId
                          ] ??
                          item.sellingPrice
                        }
                        onChange={(e) =>
                          handlePriceChange(
                            item.productId,
                            e.target.value
                          )
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Cost:{" "}
                      {formatCurrency(
                        item.costPrice *
                          item.quantity
                      )}
                    </span>

                    <span
                      className={cn(
                        "font-medium",
                        item.sellingPrice *
                          item.quantity >
                          item.costPrice *
                            item.quantity
                          ? "text-emerald-600"
                          : "text-red-500"
                      )}
                    >
                      {formatCurrency(
                        item.sellingPrice *
                          item.quantity
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TOTALS */}
        <div className="border-t border-border p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={cart.buyerType}
              onValueChange={(v) =>
                setBuyerType(v as BuyerType)
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <User className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="REGULAR_BUYER">
                  Regular
                </SelectItem>

                <SelectItem value="ENGINEER">
                  Engineer
                </SelectItem>

                <SelectItem value="WHOLESALER">
                  Wholesaler
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={cart.paymentMethod}
              onValueChange={(v) =>
                setPaymentMethod(
                  v as PaymentMethod
                )
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="CASH">
                  Cash
                </SelectItem>

                <SelectItem value="BANK_TRANSFER">
                  Bank Transfer
                </SelectItem>

                <SelectItem value="POS_TERMINAL">
                  POS Terminal
                </SelectItem>

                <SelectItem value="CREDIT">
                  Credit
                </SelectItem>

                <SelectItem value="SPLIT">
                  Split
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Tag className="h-3 w-3 text-muted-foreground shrink-0" />

            <Input
              type="number"
              min="0"
              placeholder="Discount"
              value={cart.discount || ""}
              onChange={(e) =>
                setDiscount(
                  Number(e.target.value)
                )
              }
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1 text-sm border-t border-border pt-3">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>

              <span>
                {formatCurrency(subtotal)}
              </span>
            </div>

            {cart.discount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Discount</span>

                <span>
                  -{formatCurrency(cart.discount)}
                </span>
              </div>
            )}

            <div className="flex justify-between font-bold text-base">
              <span>Total</span>

              <span>
                {formatCurrency(total)}
              </span>
            </div>

            <div
              className={cn(
                "flex justify-between text-xs",
                profit >= 0
                  ? "text-emerald-600"
                  : "text-red-500"
              )}
            >
              <span>Profit</span>

              <span>
                {formatCurrency(profit)}
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={
              cart.items.length === 0 ||
              loading
            }
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Create Order
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

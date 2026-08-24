"use client";

import { useState } from "react";
import { createProduct } from "@/actions/inventory";
import { toast } from "sonner";
import { X, Loader2, Package } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CategorySupplierCombobox } from "@/components/forms/category-supplier-combobox";

interface Props {
  shopId?: string;
  onClose: () => void;
  onSuccess: () => void;
  product?: any;
  isRSA?: boolean;
}

export function ProductFormModal({ shopId: initialShopId, onClose, onSuccess, product, isRSA }: Props) {
  const queryClient = useQueryClient();

  const [loading, setLoading]               = useState(false);
  const [selectedShopId, setSelectedShopId] = useState(initialShopId || "");
  const [categoryInput, setCategoryInput]   = useState(product?.category?.name || "");
  const [subCategoryInput, setSubCategoryInput] = useState("");
  const [supplierInput, setSupplierInput]   = useState(product?.supplier?.name || "");

  const [form, setForm] = useState({
    name:               product?.name               || "",
    sku:                product?.sku                || "",
    barcode:            product?.barcode             || "",
    description:        product?.description         || "",
    costPrice:          product ? String(product.costPrice) : "",
    wholesalePrice:     product?.wholesalePrice != null ? String(product.wholesalePrice) : "",
    retailPrice:        product?.retailPrice != null ? String(product.retailPrice) : "",
    manufacturingDate:  product?.manufacturingDate ? String(product.manufacturingDate).slice(0, 10) : "",
    expiryDate:         product?.expiryDate ? String(product.expiryDate).slice(0, 10) : "",
    stockQuantity:      product ? String(product.stockQuantity) : "0",
    lowStockThreshold:  product ? String(product.lowStockThreshold) : "10",
  });

  const shopIdToUse = selectedShopId || initialShopId || "";

  // Load shops (RSA only)
  const { data: shopsData } = useQuery({
    queryKey: ["shops-list"],
    queryFn: () => fetch("/api/shops").then(r => r.json()),
    enabled: isRSA,
  });
  const shops = shopsData?.data?.filter((s: any) => s.status === "ACTIVE") || [];

  // Load categories to find parentId when category is selected
  const { data: catsData } = useQuery({
    queryKey: ["categories-combobox", shopIdToUse],
    queryFn: () => fetch(`/api/categories?shopId=${shopIdToUse}`).then(r => r.json()),
    enabled: !!shopIdToUse,
    staleTime: 30_000,
  });
  const allCategories: any[] = catsData?.data || [];

  const selectedCategory = allCategories.find(
    c => c.name.toLowerCase() === categoryInput.trim().toLowerCase()
  );

  const { data: subCatsData } = useQuery({
    queryKey: ["subcategories-combobox", selectedCategory?.id],
    queryFn: () =>
      fetch(`/api/categories?shopId=${shopIdToUse}&parentId=${selectedCategory?.id}`).then(r => r.json()),
    enabled: !!selectedCategory?.id,
    staleTime: 30_000,
  });
  const subCategories: any[] = subCatsData?.data || [];

  const showSubCategory = !!selectedCategory;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.costPrice) {
      toast.error("Name, SKU, and cost price are required");
      return;
    }
    if (!categoryInput.trim()) {
      toast.error("Category is required");
      return;
    }
    if (!shopIdToUse) { toast.error("Please select a shop"); return; }

    setLoading(true);
    try {
      const finalCategoryName = subCategoryInput.trim() || categoryInput.trim();
      const parentCategoryId  = subCategoryInput.trim() ? selectedCategory?.id : undefined;

      await createProduct({
        name:               form.name,
        sku:                form.sku,
        barcode:            form.barcode || undefined,
        description:        form.description || undefined,
        costPrice:          parseFloat(form.costPrice),
        wholesalePrice:     form.wholesalePrice ? parseFloat(form.wholesalePrice) : undefined,
        retailPrice:        form.retailPrice ? parseFloat(form.retailPrice) : undefined,
        manufacturingDate:  form.manufacturingDate ? new Date(form.manufacturingDate) : undefined,
        expiryDate:         form.expiryDate ? new Date(form.expiryDate) : undefined,
        stockQuantity:      parseInt(form.stockQuantity) || 0,
        lowStockThreshold:  parseInt(form.lowStockThreshold) || 10,
        categoryName:       finalCategoryName,
        parentCategoryId,
        supplierName:       supplierInput.trim() || undefined,
        shopId:             shopIdToUse,
      });

      toast.success(`Product "${form.name}" created`);

      // Refresh cached lookups so a freshly-created supplier/category
      // shows up immediately the next time this modal is opened.
      queryClient.invalidateQueries({ queryKey: ["categories-combobox"] });
      queryClient.invalidateQueries({ queryKey: ["subcategories-combobox"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers-combobox"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });

      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: string, opts: any = {}) => (
    <div key={key}>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label}{opts.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={opts.type || "text"}
        value={(form as any)[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={opts.placeholder || ""}
        required={opts.required}
        min={opts.type === "number" ? "0" : undefined}
        step={opts.type === "number" ? "0.01" : undefined}
        className="form-input w-full"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Package size={16} className="text-primary" />
            {product ? "Edit Product" : "Add New Product"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Shop selector (RSA only) */}
          {isRSA && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <label className="block text-xs font-semibold text-primary mb-2">Select Shop *</label>
              <select value={selectedShopId} onChange={e => setSelectedShopId(e.target.value)}
                required className="form-input w-full">
                <option value="">— Choose a shop —</option>
                {shops.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {field("Product Name *", "name", { required: true, placeholder: "e.g. iPhone 15 Pro" })}
            {field("SKU *",          "sku",  { required: true, placeholder: "e.g. IPH-15P" })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Barcode",          "barcode",   { placeholder: "Optional" })}
            {field("Cost Price (₦) *", "costPrice", { type: "number", required: true, placeholder: "0.00" })}
          </div>

          {/* ── Pricing (new) ── */}
          <div className="grid grid-cols-2 gap-3">
            {field("Wholesale Price (₦)", "wholesalePrice", { type: "number", placeholder: "0.00" })}
            {field("Retail Price (₦)",    "retailPrice",    { type: "number", placeholder: "0.00" })}
          </div>

          {/* ── Dates (new) ── */}
          <div className="grid grid-cols-2 gap-3">
            {field("Manufacturing Date", "manufacturingDate", { type: "date" })}
            {field("Expiry Date",        "expiryDate",        { type: "date" })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("Opening Stock Qty",   "stockQuantity",     { type: "number", placeholder: "0" })}
            {field("Low Stock Threshold", "lowStockThreshold", { type: "number", placeholder: "10" })}
          </div>

          {/* ── Category (required) ── */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <CategorySupplierCombobox
              type="category"
              shopId={shopIdToUse}
              value={categoryInput}
              onChange={val => {
                setCategoryInput(val);
                setSubCategoryInput("");
              }}
              placeholder="Type or pick a category…"
              required
            />
          </div>

          {/* ── Sub-category (optional, shows when category is known) ── */}
          {showSubCategory && (
            <div className="pl-4 border-l-2 border-primary/20">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Sub-category
                <span className="ml-2 text-muted-foreground/60 font-normal">(optional)</span>
              </label>
              <CategorySupplierCombobox
                type="category"
                shopId={shopIdToUse}
                value={subCategoryInput}
                onChange={setSubCategoryInput}
                placeholder={`Sub-category under "${categoryInput}"…`}
                required={false}
              />
              {subCategories.length > 0 && !subCategoryInput && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {subCategories.length} existing sub-categories: {subCategories.slice(0, 3).map((s: any) => s.name).join(", ")}
                  {subCategories.length > 3 ? ` +${subCategories.length - 3} more` : ""}
                </p>
              )}
              {subCategoryInput && (
                <p className="text-[10px] text-primary mt-1 font-medium">
                  Product will be filed under: <strong>{categoryInput}</strong> → <strong>{subCategoryInput}</strong>
                </p>
              )}
            </div>
          )}

          {/* ── Supplier (optional) ── */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Supplier</label>
            <CategorySupplierCombobox
              type="supplier"
              shopId={shopIdToUse}
              value={supplierInput}
              onChange={setSupplierInput}
              placeholder="Type or pick a supplier…"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Optional product description" className="form-input w-full" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !shopIdToUse}
              className="flex-[2] py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
              {product ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

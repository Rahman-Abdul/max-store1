"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Check, Plus, Tag, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  shopId?: string;
  type: "category" | "supplier";
}

export function CategorySupplierCombobox({
  value, onChange, placeholder, required, shopId, type,
}: ComboboxProps) {
  const [open, setOpen]   = useState(false);
  const [input, setInput] = useState(value || "");
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const endpoint = type === "category" ? "/api/categories" : "/api/suppliers";

  const { data } = useQuery({
    queryKey: [type + "s-combobox", shopId],
    queryFn: () =>
      fetch(`${endpoint}?${shopId ? `shopId=${shopId}` : ""}`).then(r => r.json()),
    enabled: !!shopId,
    staleTime: 30_000,
  });

  const allItems: any[] = data?.data || [];

  // For categories: separate top-level and children
  const topLevel   = type === "category" ? allItems.filter(i => !i.parentId) : allItems;
  const getChildren = (parentId: string) => allItems.filter(i => i.parentId === parentId);

  // Filter by input
  const filterItems = (items: any[]) =>
    input.trim() ? items.filter(i => i.name.toLowerCase().includes(input.toLowerCase())) : items;

  const filteredTop = filterItems(topLevel);

  // When searching, also show matching children flattened
  const searchMode     = input.trim() !== "";
  const matchingChildren = searchMode
    ? allItems.filter(i => i.parentId && i.name.toLowerCase().includes(input.toLowerCase()))
    : [];

  const isNew = input.trim() !== "" &&
    !allItems.some(i => i.name.toLowerCase() === input.trim().toLowerCase());

  const select = (name: string) => {
    setInput(name);
    onChange(name);
    setOpen(false);
    setExpandedParent(null);
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    onChange(val);
    setOpen(true);
    setExpandedParent(null);
  };

  const isEmpty = !input.trim();

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || `Type or pick a ${type}…`}
          autoComplete="off"
          className={cn(
            "form-input w-full pr-8",
            required && isEmpty ? "border-red-300 dark:border-red-700" : ""
          )}
        />
        <button type="button" onClick={() => setOpen(v => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <ChevronDown size={14} />
        </button>
      </div>

      {required && isEmpty && (
        <p className="text-[10px] text-red-500 mt-1">⚠ {type === "category" ? "Category" : "Supplier"} is required</p>
      )}
      {isNew && !isEmpty && (
        <p className="text-[10px] text-primary mt-1 font-medium">✦ Will be created as new {type}</p>
      )}

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">

          {allItems.length === 0 && !isNew && (
            <p className="px-3 py-3 text-xs text-muted-foreground text-center">
              No {type}s yet — type to create one
            </p>
          )}

          {/* Search results (flat) */}
          {searchMode && (
            <>
              {filteredTop.map(item => (
                <button key={item.id} type="button" onClick={() => select(item.name)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left">
                  <div className="flex items-center gap-2">
                    <Tag size={11} className="text-pink-500 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {input.toLowerCase() === item.name.toLowerCase() && <Check size={13} className="text-primary shrink-0" />}
                </button>
              ))}
              {matchingChildren.map(item => {
                const parent = allItems.find(i => i.id === item.parentId);
                return (
                  <button key={item.id} type="button" onClick={() => select(item.name)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{parent?.name}</span>
                      <ChevronRight size={10} className="text-muted-foreground" />
                      <span>{item.name}</span>
                    </div>
                    {input.toLowerCase() === item.name.toLowerCase() && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </>
          )}

          {/* Hierarchical view (non-search) */}
          {!searchMode && type === "category" && topLevel.map(item => {
            const children   = getChildren(item.id);
            const isExpanded = expandedParent === item.id;
            return (
              <div key={item.id}>
                <div className="flex items-center">
                  <button type="button" onClick={() => select(item.name)}
                    className="flex-1 flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <Tag size={11} className="text-pink-500 shrink-0" />
                      <span className="font-medium">{item.name}</span>
                      {children.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">({children.length})</span>
                      )}
                    </div>
                    {input.toLowerCase() === item.name.toLowerCase() && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                  {children.length > 0 && (
                    <button type="button"
                      onClick={e => { e.stopPropagation(); setExpandedParent(isExpanded ? null : item.id); }}
                      className="px-2 py-2 hover:bg-muted transition-colors text-muted-foreground">
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                  )}
                </div>
                {/* Children */}
                {isExpanded && children.map(child => (
                  <button key={child.id} type="button" onClick={() => select(child.name)}
                    className="w-full flex items-center justify-between pl-8 pr-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left bg-muted/20 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <ChevronRight size={10} className="text-muted-foreground" />
                      <span>{child.name}</span>
                    </div>
                    {input.toLowerCase() === child.name.toLowerCase() && <Check size={13} className="text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            );
          })}

          {/* Supplier list (non-hierarchical) */}
          {!searchMode && type === "supplier" && allItems.map(item => (
            <button key={item.id} type="button" onClick={() => select(item.name)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left">
              <span>{item.name}</span>
              {input.toLowerCase() === item.name.toLowerCase() && <Check size={13} className="text-primary shrink-0" />}
            </button>
          ))}

          {/* Create new */}
          {isNew && (
            <button type="button" onClick={() => select(input.trim())}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary font-medium hover:bg-primary/5 transition-colors text-left border-t border-border">
              <Plus size={13} />
              Create "{input.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

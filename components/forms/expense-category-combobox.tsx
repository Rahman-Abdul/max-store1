"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const expenseIcons: Record<string, string> = {
  Salary: "👥", Fuel: "⛽", Rent: "🏢", Transport: "🚛",
  Maintenance: "🔧", "Utility Bills": "⚡", Miscellaneous: "📦", "Restock": "+",
};

interface Props {
  categories: any[];
  value: string;          // category name typed/selected
  onChange: (name: string) => void;
  required?: boolean;
}

export function ExpenseCategoryCombobox({ categories, value, onChange, required }: Props) {
  const [open, setOpen]   = useState(false);
  const [input, setInput] = useState(value || "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(value || ""); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const list = Array.isArray(categories) ? categories : (categories as any)?.data || [];

  const filtered = input.trim()
    ? list.filter((c: any) => c.name.toLowerCase().includes(input.toLowerCase()))
    : list;

  const isNew = input.trim() !== "" &&
    !list.some((c: any) => c.name.toLowerCase() === input.trim().toLowerCase());

  const select = (name: string) => {
    setInput(name);
    onChange(name);
    setOpen(false);
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    onChange(val);
    setOpen(true);
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
          placeholder="Type or pick a category…"
          autoComplete="off"
          required={required}
          className={cn(
            "w-full px-3 py-2.5 pr-8 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30",
            required && isEmpty ? "border-red-300 dark:border-red-700" : ""
          )}
        />
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {isNew && !isEmpty && (
        <p className="text-[10px] text-primary mt-1 font-medium">✦ Will be created as new category</p>
      )}

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filtered.length === 0 && !isNew && (
            <p className="px-3 py-3 text-xs text-muted-foreground text-center">
              {list.length === 0 ? "No categories yet — type to create one" : "No matches — type to create new"}
            </p>
          )}
          {filtered.map((c: any) => (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.name)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
            >
              <span>{expenseIcons[c.name] || "📋"} {c.name}</span>
              {input.toLowerCase() === c.name.toLowerCase() && (
                <Check size={13} className="text-primary shrink-0" />
              )}
            </button>
          ))}
          {isNew && (
            <button
              type="button"
              onClick={() => select(input.trim())}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary font-medium hover:bg-primary/5 transition-colors text-left border-t border-border"
            >
              <Plus size={13} />
              Create "{input.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

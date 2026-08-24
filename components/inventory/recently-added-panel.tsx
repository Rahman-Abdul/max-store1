"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRecentlyAddedProducts } from "@/actions/inventory";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Package, User, ChevronDown, ChevronUp, CalendarDays,
  Search, X, BarChart3, ArrowUp, RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface Props { shopId?: string; }

function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function formatTime(d: Date) { return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); }
function formatDateKey(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export function RecentlyAddedPanel({ shopId }: Props) {
  const [open, setOpen]             = useState(true);
  const [search, setSearch]         = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["recently-added", shopId],
    queryFn: () => getRecentlyAddedProducts({ shopId }),
    enabled: open,
  });

  const allEntries: any[] = (data?.success ? data?.data : []) || [];

  // Filter by search
  const searched = search.trim()
    ? allEntries.filter(e =>
        (e.name  || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.sku   || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.category?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.addedBy?.name  || "").toLowerCase().includes(search.toLowerCase())
      )
    : allEntries;

  // Group by calendar date
  const byDate: Record<string, any[]> = {};
  for (const e of searched) {
    const key = isoDate(new Date(e.createdAt));
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(e);
  }
  const dateKeys   = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  const visibleKeys = selectedDate ? [selectedDate] : dateKeys;
  const totalAll   = searched.length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg">
            <CalendarDays size={16} className="text-emerald-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">Stock Additions</p>
            <p className="text-xs text-muted-foreground">
              All products added &amp; restocked · grouped by date · who did it
            </p>
          </div>
          {totalAll > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-700 text-xs font-semibold rounded-full">
              {totalAll} entries
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); refetch(); }}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
            <RefreshCw size={13} />
          </button>
          {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-border">

          {/* Search + date filter bar */}
          <div className="px-4 py-3 flex flex-wrap gap-3 border-b border-border bg-muted/20">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by product, SKU, category, admin…"
                className="w-full pl-8 pr-4 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>
            {selectedDate && (
              <button onClick={() => setSelectedDate(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                <X size={12} />
              </button>
            )}
          </div>

          {/* Date summary cards */}
          {!isLoading && dateKeys.length > 0 && (
            <div className="px-4 py-3 flex gap-2 flex-wrap border-b border-border bg-muted/10">
              <button onClick={() => setSelectedDate(null)}
                className={cn(
                  "flex flex-col items-center px-4 py-2.5 rounded-xl border text-xs font-medium transition-all",
                  !selectedDate ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}>
                <span className="text-lg font-bold leading-tight">{totalAll}</span>
                <span className="opacity-80">All</span>
              </button>
              {dateKeys.map(key => {
                const d    = new Date(key + "T00:00:00");
                const count = byDate[key].length;
                const now   = new Date();
                const todayKey     = isoDate(now);
                const yesterdayKey = isoDate(new Date(now.getTime() - 864e5));
                const label = key === todayKey ? "Today"
                  : key === yesterdayKey ? "Yesterday"
                  : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
                return (
                  <button key={key} onClick={() => setSelectedDate(selectedDate === key ? null : key)}
                    className={cn(
                      "flex flex-col items-center px-4 py-2.5 rounded-xl border text-xs font-medium transition-all",
                      selectedDate === key ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}>
                    <span className="text-lg font-bold leading-tight">{count}</span>
                    <span className="opacity-80">{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}
            </div>
          ) : searched.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <Package size={36} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">No stock additions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opening</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty Added</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stock After</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Added By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time</th>
                    {!shopId && <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shop</th>}
                    <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleKeys.map(dateKey => {
                    const entries = byDate[dateKey];
                    if (!entries) return null;
                    const d = new Date(dateKey + "T00:00:00");
                    const groupOffset = visibleKeys
                      .slice(0, visibleKeys.indexOf(dateKey))
                      .reduce((s, k) => s + (byDate[k]?.length || 0), 0);

                    return (
                      <React.Fragment key={dateKey}>
                        {/* Date group header */}
                        <tr className="bg-muted/20 border-b border-border/50">
                          <td colSpan={!shopId ? 14 : 13} className="px-4 py-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CalendarDays size={13} className="text-primary" />
                                <span className="text-xs font-bold text-foreground">{formatDateKey(d)}</span>
                              </div>
                              <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                {entries.length} {entries.length === 1 ? "entry" : "entries"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {entries.map((entry: any, idx: number) => {
                          const entryDate = new Date(entry.createdAt);
                          const isRestock = entry.logType === "RESTOCK";
                          return (
                            <tr key={entry.logId || entry.id + idx}
                              className="border-b border-border/40 hover:bg-muted/20 transition-colors">

                              {/* # */}
                              <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                                {groupOffset + idx + 1}
                              </td>

                              {/* Type badge */}
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                                  isRestock
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40"
                                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                                )}>
                                  <ArrowUp size={10} />
                                  {isRestock ? "Restock" : "New"}
                                </span>
                              </td>

                              {/* Product */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                                    {entry.image
                                      ? <img src={entry.image} alt={entry.name} className="w-full h-full object-cover" />
                                      : <Package size={14} className="text-muted-foreground/50" />}
                                  </div>
                                  <span className="font-medium text-sm">{entry.name || "—"}</span>
                                </div>
                              </td>

                              {/* SKU */}
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs text-muted-foreground">{entry.sku || "—"}</span>
                              </td>

                              {/* Category */}
                              <td className="px-4 py-3">
                                {entry.category?.name
                                  ? <span className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium">{entry.category.name}</span>
                                  : <span className="text-xs text-muted-foreground/40">—</span>}
                              </td>

                              {/* Cost */}
                              <td className="px-4 py-3 text-right">
                                <span className="font-semibold text-sm">{formatCurrency(entry.costPrice)}</span>
                              </td>

                              {/* Opening Stock (quantityBefore) */}
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm tabular-nums text-muted-foreground">
                                  {entry.quantityBefore ?? 0}
                                </span>
                              </td>

                              {/* Qty Added */}
                              <td className="px-4 py-3 text-right">
                                <span className="font-bold text-sm text-emerald-600 tabular-nums">
                                  +{entry.quantityAdded}
                                </span>
                              </td>

                              {/* Stock After */}
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm tabular-nums text-muted-foreground">
                                  {entry.quantityAfter}
                                </span>
                              </td>

                              {/* Added By */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <User size={10} className="text-primary" />
                                  </div>
                                  <span className="text-xs font-medium">
                                    {entry.addedBy?.name || "System"}
                                  </span>
                                </div>
                              </td>

                              {/* Date */}
                              <td className="px-4 py-3">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {entryDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                              </td>

                              {/* Time */}
                              <td className="px-4 py-3">
                                <span className="text-xs font-mono text-muted-foreground">{formatTime(entryDate)}</span>
                              </td>

                              {/* Shop (RSA only) */}
                              {!shopId && (
                                <td className="px-4 py-3">
                                  <span className="text-xs text-muted-foreground">{entry.shop?.name || "—"}</span>
                                </td>
                              )}

                              {/* View */}
                              <td className="px-4 py-3">
                                {entry.id && (
                                  <Link href={`/dashboard/inventory/${entry.id}`}
                                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors inline-flex">
                                    <BarChart3 size={14} />
                                  </Link>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

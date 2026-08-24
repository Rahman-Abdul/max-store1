import Link from "next/link";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  href?: string;
  color?: string;
  change?: number;
  prefix?: string;
}

export function StatCard({ title, value, subValue, icon: Icon, href, color = "bg-primary", change, prefix }: Props) {
  const content = (
    <div className="stat-card group p-5 rounded-xl border bg-card hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl", color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {change !== undefined && (
          <span className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            change >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold font-display">
        {prefix}{typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
      {subValue && <p className="text-xs text-muted-foreground/70 mt-0.5">{subValue}</p>}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

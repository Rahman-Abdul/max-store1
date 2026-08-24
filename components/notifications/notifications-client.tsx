"use client";

import { useState, useTransition } from "react";
import { formatRelativeTime, cn } from "@/lib/utils";
import { Bell, BellOff, CheckCheck, Package, ShoppingCart, RotateCcw, AlertTriangle, DollarSign, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Notification {
  id: string; type: string; title: string; message: string;
  read: boolean; createdAt: Date; data?: any;
}

interface Props { notifications: Notification[]; }

const iconMap: Record<string, React.ElementType> = {
  LOW_STOCK: AlertTriangle,
  NEW_SALE: ShoppingCart,
  REFUND: RotateCcw,
  EXPENSE_APPROVED: DollarSign,
  INVENTORY: Package,
};

const colorMap: Record<string, string> = {
  LOW_STOCK: "bg-amber-100 text-amber-600 dark:bg-amber-900/30",
  NEW_SALE: "bg-green-100 text-green-600 dark:bg-green-900/30",
  REFUND: "bg-blue-100 text-blue-600 dark:bg-blue-900/30",
  EXPENSE_APPROVED: "bg-purple-100 text-purple-600 dark:bg-purple-900/30",
};

export function NotificationsClient({ notifications: initial }: Props) {
  const [notifications, setNotifications] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const unread = notifications.filter(n => !n.read).length;

  const markRead = (id: string) => {
    startTransition(async () => {
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    });
  };

  const markAllRead = () => {
    startTransition(async () => {
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" onClick={markAllRead} disabled={isPending}>
            <CheckCheck className="h-4 w-4 mr-2" />Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BellOff className="h-16 w-16 mb-4 opacity-20" />
            <p className="font-medium">No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => {
            const Icon = iconMap[n.type] || Info;
            const color = colorMap[n.type] || "bg-gray-100 text-gray-600";
            return (
              <div key={n.id} onClick={() => !n.read && markRead(n.id)}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer",
                  n.read
                    ? "bg-card border-border text-muted-foreground"
                    : "bg-primary/5 border-primary/20 hover:bg-primary/10"
                )}>
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("text-sm font-medium", !n.read && "text-foreground")}>{n.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary" />}
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

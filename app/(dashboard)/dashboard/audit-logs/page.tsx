import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, cn } from "@/lib/utils";
import { ShieldCheck, User, Database, Key } from "lucide-react";

export const dynamic = "force-dynamic";

const actionColors: Record<string, string> = {
  CREATE: "badge-success",
  UPDATE: "badge-info",
  DELETE: "badge-danger",
  LOGIN: "badge-success",
  LOGOUT: "bg-gray-100 text-gray-700",
  PASSWORD_RESET: "badge-warning",
  ACCOUNT_SUSPEND: "badge-danger",
  ACCOUNT_ACTIVATE: "badge-success",
  ROLE_ASSIGN: "badge-purple",
  SHOP_ASSIGN: "badge-info",
};

const actionIcons: Record<string, string> = {
  CREATE: "✅", UPDATE: "✏️", DELETE: "🗑️",
  LOGIN: "🔐", LOGOUT: "👋",
  PASSWORD_RESET: "🔑", ACCOUNT_SUSPEND: "🚫",
  ACCOUNT_ACTIVATE: "✅", ROLE_ASSIGN: "🎭", SHOP_ASSIGN: "🏪",
};

export default async function AuditLogsPage() {
  const session = await auth();
  const user = session!.user as any;

  if (user.role !== "ROOT_SUPER_ADMIN") redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Complete security and activity audit trail</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Actions", value: logs.length, color: "bg-blue-600", icon: Database },
          { label: "Password Resets", value: logs.filter(l => l.action === "PASSWORD_RESET").length, color: "bg-amber-600", icon: Key },
          { label: "Suspensions", value: logs.filter(l => l.action === "ACCOUNT_SUSPEND").length, color: "bg-red-600", icon: ShieldCheck },
          { label: "Account Creates", value: logs.filter(l => l.action === "CREATE" && l.entityType === "User").length, color: "bg-green-600", icon: User },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className={cn("p-2 rounded-xl w-fit mb-3", s.color)}>
              <s.icon size={18} className="text-white" />
            </div>
            <p className="text-2xl font-bold font-display">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Logs table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <ShieldCheck size={16} className="text-muted-foreground" />
          <h3 className="font-semibold">Recent Activity (Last 100)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td>
                    <div>
                      <p className="text-sm font-medium">{log.user.name}</p>
                      <p className="text-xs text-muted-foreground">{log.user.role.replace(/_/g, " ")}</p>
                    </div>
                  </td>
                  <td>
                    <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", actionColors[log.action] || "badge-info")}>
                      {actionIcons[log.action] || "•"} {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="text-sm">
                    <p className="font-medium">{log.entityType}</p>
                    {log.entityId && (
                      <p className="text-xs text-muted-foreground font-mono">{log.entityId.slice(0, 12)}…</p>
                    )}
                  </td>
                  <td className="text-xs text-muted-foreground max-w-xs">
                    {log.newData ? (
                      <pre className="text-xs truncate">
                        {JSON.stringify(log.newData, null, 0).slice(0, 60)}
                      </pre>
                    ) : "—"}
                  </td>
                  <td className="text-xs text-muted-foreground font-mono">
                    {log.ipAddress || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

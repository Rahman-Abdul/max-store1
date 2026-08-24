"use client";

import { useState } from "react";

import {
  Settings,
  Shield,
  Bell,
  Palette,
  Database,
  Globe,
} from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  {
    id: "general",
    label: "General",
    icon: Settings,
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Globe,
  },
  {
    id: "system",
    label: "System",
    icon: Database,
  },
];

export function SettingsClient({
  user,
}: {
  user: any;
}) {
  const [activeTab, setActiveTab] =
    useState("general");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">
          System Settings
        </h1>

        <p className="page-subtitle">
          Configure your EnterprisePOS
          platform
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-52 shrink-0">
          <nav
            className="space-y-1"
            aria-label="Settings navigation"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-label={tab.label}
                onClick={() =>
                  setActiveTab(tab.id)
                }
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <tab.icon size={16} />

                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 bg-card border border-border rounded-2xl p-6">
          {activeTab === "general" && (
            <GeneralSettings />
          )}

          {activeTab === "security" && (
            <SecuritySettings />
          )}

          {activeTab ===
            "notifications" && (
            <NotificationSettings />
          )}

          {activeTab ===
            "appearance" && (
            <AppearanceSettings />
          )}

          {activeTab ===
            "integrations" && (
            <IntegrationsSettings />
          )}

          {activeTab === "system" && (
            <SystemSettings />
          )}
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const fields = [
    {
      id: "system-name",
      label: "System Name",
      value: "EnterprisePOS",
      placeholder: "System name",
    },
    {
      id: "support-email",
      label: "Support Email",
      value: "",
      placeholder:
        "support@company.com",
    },
    {
      id: "currency",
      label: "Default Currency",
      value: "NGN",
      placeholder: "Currency code",
    },
    {
      id: "timezone",
      label: "Timezone",
      value: "Africa/Lagos",
      placeholder: "Timezone",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">
          General Settings
        </h2>

        <p className="text-sm text-muted-foreground">
          Configure basic system
          preferences
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.id}>
            <label
              htmlFor={field.id}
              className="text-xs font-medium text-muted-foreground mb-1.5 block"
            >
              {field.label}
            </label>

            <input
              id={field.id}
              name={field.id}
              type="text"
              defaultValue={field.value}
              placeholder={
                field.placeholder
              }
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        ))}

        <button
          type="button"
          aria-label="Save general settings"
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  const settings = [
    {
      id: "session-timeout",
      label:
        "Session Timeout (minutes)",
      description:
        "Auto-logout inactive users",
      defaultValue: "30",
    },
    {
      id: "failed-attempts",
      label:
        "Max Failed Login Attempts",
      description:
        "Lock account after failed attempts",
      defaultValue: "5",
    },
    {
      id: "password-length",
      label:
        "Password Minimum Length",
      description:
        "Minimum characters required",
      defaultValue: "8",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">
          Security Settings
        </h2>

        <p className="text-sm text-muted-foreground">
          Manage security policies
          and access controls
        </p>
      </div>

      <div className="space-y-4">
        {settings.map((setting) => (
          <div
            key={setting.id}
            className="flex items-center justify-between p-4 border border-border rounded-xl"
          >
            <div>
              <p className="text-sm font-medium">
                {setting.label}
              </p>

              <p className="text-xs text-muted-foreground">
                {setting.description}
              </p>
            </div>

            <div>
              <label
                htmlFor={setting.id}
                className="sr-only"
              >
                {setting.label}
              </label>

              <input
                id={setting.id}
                name={setting.id}
                type="number"
                defaultValue={
                  setting.defaultValue
                }
                className="w-20 px-2 py-1.5 text-sm border border-border rounded-lg text-center bg-background focus:outline-none"
              />
            </div>
          </div>
        ))}

        {/* 2FA */}
        <div className="flex items-center justify-between p-4 border border-border rounded-xl">
          <div>
            <p className="text-sm font-medium">
              Two-Factor Authentication
            </p>

            <p className="text-xs text-muted-foreground">
              Require 2FA for admin
              accounts
            </p>
          </div>

          <label
            htmlFor="two-factor"
            className="relative inline-flex items-center cursor-pointer"
          >
            <input
              id="two-factor"
              name="two-factor"
              type="checkbox"
              className="sr-only peer"
            />

            <div className="w-11 h-6 bg-muted peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>

        <button
          type="button"
          aria-label="Save security settings"
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Save Security Settings
        </button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  const notifications = [
    {
      id: "low-stock",
      label: "Low Stock Alerts",
      description:
        "Notify when products reach threshold",
    },
    {
      id: "sales",
      label:
        "New Sale Notifications",
      description:
        "Alert on every completed sale",
    },
    {
      id: "refunds",
      label: "Refund Requests",
      description:
        "Alert when refund is requested",
    },
    {
      id: "daily-report",
      label:
        "Daily Closing Report",
      description:
        "Send auto-generated daily report",
    },
    {
      id: "failed-login",
      label:
        "Failed Login Alerts",
      description:
        "Notify on suspicious login attempts",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">
          Notification Settings
        </h2>

        <p className="text-sm text-muted-foreground">
          Configure alerts and
          notification channels
        </p>
      </div>

      <div className="space-y-3">
        {notifications.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 border border-border rounded-xl"
          >
            <div>
              <p className="text-sm font-medium">
                {item.label}
              </p>

              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>

            <label
              htmlFor={item.id}
              className="relative inline-flex items-center cursor-pointer"
            >
              <input
                id={item.id}
                name={item.id}
                type="checkbox"
                defaultChecked
                className="sr-only peer"
              />

              <div className="w-11 h-6 bg-muted peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const themes = [
    "Light",
    "Dark",
    "System",
  ];

  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">
          Appearance
        </h2>

        <p className="text-sm text-muted-foreground">
          Customize the look and
          feel
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-3 block">
            Theme Mode
          </label>

          <div className="grid grid-cols-3 gap-3">
            {themes.map((theme) => (
              <button
                key={theme}
                type="button"
                aria-label={`${theme} theme`}
                className="p-4 border-2 border-border hover:border-primary/50 rounded-xl text-sm font-medium transition-colors"
              >
                {theme === "Light"
                  ? "☀️"
                  : theme === "Dark"
                  ? "🌙"
                  : "💻"}{" "}
                {theme}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-3 block">
            Accent Color
          </label>

          <div className="flex gap-3">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Select color ${color}`}
                className="w-8 h-8 rounded-full border-2 border-transparent hover:border-foreground/30 transition-all"
                style={{
                  backgroundColor: color,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsSettings() {
  const integrations = [
    {
      name: "WhatsApp Business API",
      status: "disconnected",
      icon: "💬",
      desc: "Send receipts via WhatsApp",
    },
    {
      name: "Pusher",
      status: "connected",
      icon: "⚡",
      desc: "Real-time notifications",
    },
    {
      name: "Cloudinary",
      status: "disconnected",
      icon: "☁️",
      desc: "Image and file storage",
    },
    {
      name: "Resend (Email)",
      status: "disconnected",
      icon: "📧",
      desc: "Email notifications",
    },
    {
      name: "Twilio SMS",
      status: "disconnected",
      icon: "📱",
      desc: "SMS notifications",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">
          Integrations
        </h2>

        <p className="text-sm text-muted-foreground">
          Connect external services
        </p>
      </div>

      <div className="space-y-3">
        {integrations.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between p-4 border border-border rounded-xl"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {item.icon}
              </span>

              <div>
                <p className="text-sm font-medium">
                  {item.name}
                </p>

                <p className="text-xs text-muted-foreground">
                  {item.desc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  item.status ===
                    "connected"
                    ? "badge-success"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                )}
              >
                {item.status}
              </span>

              <button
                type="button"
                aria-label={`${item.status === "connected" ? "Configure" : "Connect"} ${item.name}`}
                className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors"
              >
                {item.status ===
                "connected"
                  ? "Configure"
                  : "Connect"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemSettings() {
  const actions = [
    {
      label: "Export All Data",
      desc: "Download complete backup",
      action: "Export",
      color: "border-border",
    },
    {
      label: "Clear Cache",
      desc: "Clear temp cache files",
      action: "Clear Cache",
      color: "border-border",
    },
    {
      label: "View System Logs",
      desc: "View error and access logs",
      action: "View Logs",
      color: "border-border",
    },
    {
      label: "Reset Demo Data",
      desc: "Irreversible action",
      action: "Reset",
      color:
        "border-red-300 dark:border-red-800",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">
          System
        </h2>

        <p className="text-sm text-muted-foreground">
          Database and system
          operations
        </p>
      </div>

      <div className="space-y-3">
        {actions.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center justify-between p-4 border rounded-xl",
              item.color
            )}
          >
            <div>
              <p className="text-sm font-medium">
                {item.label}
              </p>

              <p className="text-xs text-muted-foreground">
                {item.desc}
              </p>
            </div>

            <button
              type="button"
              aria-label={item.action}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                item.action === "Reset"
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "border border-border hover:bg-muted"
              )}
            >
              {item.action}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-muted/50 rounded-xl text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">
          System Information
        </p>

        <p>Version: 1.0.0</p>
        <p>Framework: Next.js 15</p>
        <p>Database: PostgreSQL</p>
        <p>Runtime: Node.js 20</p>
      </div>
    </div>
  );
}

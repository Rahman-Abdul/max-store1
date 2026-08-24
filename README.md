# 🏪 EnterprisePOS — Multi-Shop Business Management System

A full-stack, enterprise-grade **Point of Sale, Inventory, Sales, Accounting, and Business Management System** built entirely with the Next.js ecosystem.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.3 (App Router) |
| Language | TypeScript 5.8 |
| UI | Tailwind CSS 3.4 + Radix UI |
| State | Zustand 5 + TanStack Query 5 |
| Database | PostgreSQL (via Prisma ORM 6) |
| Auth | Auth.js (NextAuth v5) |
| Real-time | Server-Sent Events (built-in, no 3rd party) |
| Charts | Recharts 2 |
| Icons | Lucide React 0.511 |

---

## 📋 Features

### 🔐 Security & Authentication
- Root Super Admin-controlled authentication (only RSA can create/reset passwords)
- Role-based access control (RBAC) with 4 roles
- JWT session management with bcrypt password hashing
- Failed login tracking, account suspension
- Complete audit trail for all admin actions
- Middleware-level route protection

### 🏪 Multi-Shop POS
- Fast POS terminal with keyboard shortcuts
- Dynamic selling price entry per sale
- Buyer type selection (Engineer / Regular / Wholesaler)
- Order code generation → Cashier confirmation flow
- Multiple payment methods including split payments
- Real-time cart with profit preview
- Barcode scanner support

### 📦 Inventory Management
- Product CRUD with SKU, barcode, cost price
- Auto stock deduction on sale confirmation
- Low stock alerts and thresholds
- Restock history and supplier tracking
- Damaged product recording with cost loss calculation
- Full inventory movement logs per product

### 💰 Financial Management
- Complete sales history with drill-down views
- Profit/loss calculation per sale and per product
- Expense management with approval workflow
- Customer debt tracking and repayment history
- Refund/return/swap processing pipeline
- Daily closing report generation

### 📊 Analytics & AI Insights
- Revenue and profit trend charts (7d/30d/12m)
- Buyer type breakdown analytics
- Top products by revenue
- Staff performance ranking
- Rule-based AI insights and recommendations
- Export to CSV/PDF

### 📱 PWA Support
- Installable on mobile devices
- Offline-ready architecture
- Touch-optimized POS interface

---

## 🗂️ Project Structure

```
enterprise-pos/
├── app/
│   ├── (auth)/login/            # Login page
│   ├── (dashboard)/             # Protected dashboard routes
│   │   ├── dashboard/           # Main dashboard
│   │   ├── pos/                 # POS Terminal
│   │   ├── cashier/             # Cashier desk
│   │   ├── inventory/           # Inventory management
│   │   ├── sales/               # Sales history
│   │   ├── customers/           # Customer management
│   │   ├── staff/               # Staff management
│   │   ├── expenses/            # Expense tracking
│   │   ├── debts/               # Debt management
│   │   ├── refunds/             # Refunds & returns
│   │   ├── analytics/           # AI analytics
│   │   ├── closing-reports/     # Daily closing reports
│   │   ├── audit-logs/          # Security audit trail
│   │   ├── shops/               # Shop management
│   │   └── settings/            # System settings
│   └── api/
│       ├── pusher/              # SSE real-time endpoint
│       ├── auth/[...nextauth]/  # Auth.js handler
│       ├── customers/
│       ├── expenses/categories/
│       ├── shops/
│       └── closing-reports/
├── actions/                     # Server Actions
│   ├── sales.ts
│   ├── inventory.ts
│   ├── users.ts
│   ├── analytics.ts
│   └── operations.ts
├── components/                  # React components
│   ├── dashboard/
│   ├── inventory/
│   ├── receipts/
│   ├── analytics/
│   ├── forms/
│   ├── navigation/
│   ├── reports/
│   └── settings/
├── components/ui/               # Radix UI component library (20+ components)
├── lib/
│   ├── prisma.ts
│   └── utils.ts
├── store/                       # Zustand stores
├── types/                       # TypeScript types & enums
├── prisma/
│   ├── schema.prisma            # Full database schema (26+ models)
│   └── seed.ts                  # Demo data seeder
├── auth.ts                      # Auth.js config
└── middleware.ts                # RBAC middleware
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 14+
- npm or pnpm

### 2. Clone & Install

```bash
git clone <your-repo>
cd enterprise-pos
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/enterprise_pos"
AUTH_SECRET="your-secret-here"   # openssl rand -base64 32
AUTH_URL="http://localhost:3000"
```

### 4. Database Setup

```bash
# Push schema to database
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed demo data
npm run db:seed
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Root Super Admin | superadmin@posystem.com | SuperAdmin@123 |
| Shop Admin | shopadmin@posystem.com | ShopAdmin@123 |
| Staff | staff@posystem.com | Staff@123 |
| Cashier | cashier@posystem.com | Cashier@123 |

---

## 🌐 Production Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Set these environment variables in the Vercel dashboard:
- `DATABASE_URL` → Neon or Supabase connection string
- `AUTH_SECRET` → Random 32+ character secret
- `AUTH_URL` → Your production URL

### Database — Neon (Recommended)

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to `DATABASE_URL`
4. Run `npm run db:push` with the production URL

### Database — Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection String
3. Use the direct connection string
4. Run migrations

---

## 🔄 Real-time Architecture

Real-time updates use **native Server-Sent Events** — no third-party service required.

The SSE endpoint lives at `/api/pusher`. Clients subscribe once; the server pushes events on inventory changes, new sales, and cashier actions. No API keys or paid plan needed.

---

## 📱 PWA Installation

1. Open the app on mobile Chrome/Safari
2. Tap "Add to Home Screen"
3. The app installs as a native-like PWA
4. Access POS and Cashier via the installed shortcuts

---

## 🔒 Security Architecture

### Password Policy
- **ONLY Root Super Admin** can create accounts and set passwords
- No user can change their own password without RSA approval
- All password resets are logged in the audit trail
- Bcrypt hashing with 12 salt rounds

### Session Management
- JWT sessions with configurable expiry
- All logins tracked with IP and device info
- Failed login counter with automatic tracking
- Account suspension locks all sessions

### RBAC Middleware
Every route is protected by middleware checking:
1. Authentication (valid session)
2. Authorization (role has access to route)
3. Shop-level isolation (users only see their shop's data)

---

## 📊 Database Schema

The system includes 26+ database models:

- `User`, `Session`, `UserShop`
- `Shop`, `Category`, `Product`, `Supplier`
- `Sale`, `SaleItem`, `Payment`, `Receipt`
- `Customer`, `Debt`, `DebtPayment`
- `Refund`, `Return`, `ReturnItem`, `ProductSwap`
- `DamagedProduct`, `InventoryLog`, `RestockHistory`
- `Expense`, `ExpenseCategory`
- `ClosingReport`, `AuditLog`, `ActivityLog`
- `Notification`, `AIInsight`
- `Currency`, `ExchangeRate`, `WhatsAppLog`

---

## 🖨️ Thermal Printer Support

The receipt modal supports printing to:
- 58mm thermal printers
- 80mm thermal printers
- Any printer via browser print API
- PDF download

Receipt includes shop logo, QR code, and all transaction details.

---

## 🧩 Adding Custom Features

### New Server Action
```typescript
// actions/my-feature.ts
"use server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function myAction(data: any) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  // ... implementation
}
```

### New Page Route
```
app/(dashboard)/my-feature/page.tsx
```

Add the route to the middleware permissions and sidebar navigation.

---

## 📈 Scaling Considerations

- Use **Neon** serverless PostgreSQL for auto-scaling
- Enable **Vercel Edge Network** for global CDN
- Implement **Redis** caching for frequently accessed analytics
- Enable **Prisma Accelerate** for connection pooling

---

## 🐛 Troubleshooting

**Prisma errors**: Run `npm run db:generate` after schema changes

**Auth issues**: Ensure `AUTH_SECRET` is set and `AUTH_URL` matches your domain

**Build errors**: Delete `.next` folder and rebuild

**SSE not connecting**: Ensure your hosting platform supports streaming responses (Vercel does by default)

---

## 📄 License

MIT License — Free to use and modify for commercial projects.

---

Built with ❤️ using Next.js 15, TypeScript, Prisma, and TailwindCSS.
# max-store1
# max-store1

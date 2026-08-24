#!/bin/bash
# =====================================================
# EnterprisePOS — Database Setup Helper
# Run: bash scripts/setup-db.sh
# =====================================================
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║      EnterprisePOS Database Setup        ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Environment ───────────────────────────────────
echo "▶ Setup environment?"
echo "  1) Local development (localhost)"
echo "  2) Production (Vercel + cloud database)"
read -r ENV_CHOICE

if [[ "$ENV_CHOICE" == "2" ]]; then
  IS_PROD=true
else
  IS_PROD=false
fi

# ── Database connection ───────────────────────────
if [ "$IS_PROD" = true ]; then
  echo ""
  echo "▶ Paste your cloud DATABASE_URL:"
  echo "  (Supabase / Neon / Vercel Postgres connection string)"
  echo "  Format: postgresql://user:pass@host:5432/dbname"
  read -rs DATABASE_URL; echo ""

  echo ""
  echo "▶ Your Vercel production URL? (e.g. https://luckystar-six.vercel.app)"
  read -r APP_URL
  APP_URL="${APP_URL%/}"  # strip trailing slash
else
  echo ""
  echo "▶ PostgreSQL username? (default: postgres)"
  read -r PG_USER; PG_USER="${PG_USER:-postgres}"

  echo "▶ PostgreSQL password?"
  read -rs PG_PASS; echo ""

  echo "▶ PostgreSQL port? (default: 5432)"
  read -r PG_PORT; PG_PORT="${PG_PORT:-5432}"

  DB_NAME="enterprise_pos"
  DATABASE_URL="postgresql://${PG_USER}:${PG_PASS}@localhost:${PG_PORT}/${DB_NAME}"
  APP_URL="https://luckystar-six.vercel.app"

  echo ""
  echo "  Connection: postgresql://${PG_USER}:****@localhost:${PG_PORT}/${DB_NAME}"

  # Create local database
  echo ""
  echo "▶ Creating database..."
  PGPASSWORD="$PG_PASS" createdb -U "$PG_USER" -p "$PG_PORT" "$DB_NAME" 2>/dev/null \
    && echo "  ✅ Database created" \
    || echo "  ℹ️  Database already exists"
fi

# ── Generate secrets ──────────────────────────────
echo ""
echo "▶ Generating AUTH_SECRET..."
AUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
echo "  ✅ Secret generated"

# ── Write .env ────────────────────────────────────
echo ""
echo "▶ Writing .env..."

cat > .env << ENVEOF
# Database
DATABASE_URL="${DATABASE_URL}"

# Auth — AUTH_URL must match your deployment URL exactly
AUTH_SECRET="${AUTH_SECRET}"
AUTH_URL="${APP_URL}"

# WhatsApp (optional)
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_ACCESS_TOKEN=""
ENVEOF

echo "  ✅ .env written"

# ── Push schema ───────────────────────────────────
echo ""
echo "▶ Pushing schema..."
npx prisma db push

# ── Seed ─────────────────────────────────────────
echo ""
echo "▶ Seeding demo accounts..."
npm run db:seed

# ── Vercel env vars reminder ──────────────────────
if [ "$IS_PROD" = true ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║        ⚠️  IMPORTANT — Add to Vercel Dashboard       ║"
  echo "╠══════════════════════════════════════════════════════╣"
  echo "║  Go to: Vercel → Settings → Environment Variables    ║"
  echo "║                                                       ║"
  echo "║  DATABASE_URL  → your cloud DB connection string     ║"
  echo "║  AUTH_SECRET   → $(echo "$AUTH_SECRET" | cut -c1-20)...  ║"
  echo "║  AUTH_URL      → ${APP_URL}  ║"
  echo "╠══════════════════════════════════════════════════════╣"
  echo "║  Then: Vercel → Deployments → Redeploy               ║"
  echo "╚══════════════════════════════════════════════════════╝"
else
  echo ""
  echo "╔══════════════════════════════════════════╗"
  echo "║        ✅  Setup Complete!               ║"
  echo "║  npm run dev → http://localhost:3000     ║"
  echo "╚══════════════════════════════════════════╝"
fi

echo ""
echo "  ⚠️  Login credentials are set in db:seed"
echo "  ⚠️  Change default passwords after first login!"
echo ""

# Casezy WhatsApp Shop

WhatsApp commerce orchestration app — receives customer data from WhatsApp (ChatMint), creates Cashfree payment links, creates Shopify orders after payment, and sends tracking notifications back via WhatsApp.

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- NextAuth (credentials, JWT, 24h sessions)
- Tailwind CSS + Poppins/Archivo fonts
- Integrations: Cashfree, Shopify Admin API, ChatMint (WhatsApp)
- AES-256-GCM encryption for stored API keys

## Quick Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run db:migrate       # Run Prisma migrations
npm run db:push          # Push schema directly (dev)
npm run db:seed          # Seed admin user (admin@casezy.in / admin123) + sample product
npm run db:studio        # Open Prisma Studio (DB browser)
npm run build            # Production build
```

## Architecture

```
src/
├── services/           # Business logic
│   ├── checkout        # WhatsApp intake → checkout creation → payment link → WA message
│   ├── cashfree        # Payment link creation, status checks
│   ├── shopify         # Shopify order creation via Admin API
│   ├── shopify-sync    # Async job queue with exponential backoff retry (5 attempts)
│   ├── whatsapp        # ChatMint template messaging (configurable template names)
│   └── logger          # Centralized audit logging to all log tables
├── app/api/
│   ├── admin/          # Dashboard, orders, products, settings, logs, export (auth required)
│   ├── webhooks/       # Cashfree (payment) + Shopify (fulfillment) — signature verified
│   ├── whatsapp/       # Intake endpoint (API key auth via x-api-key header)
│   └── cron/           # Process pending Shopify sync retries
├── app/admin/          # Dashboard, orders, products, logs, settings pages
├── lib/
│   ├── config          # Env config + async DB-backed getter (60s cache, env fallback)
│   ├── encryption      # AES-256-GCM encrypt/decrypt/mask for API keys
│   ├── integration-keys # Field definitions for ChatMint, Cashfree, Shopify settings
│   ├── auth, db, errors, id, validation
├── components/         # admin/ (Sidebar, DashboardMetrics, tables) + shared/ (StatusBadge, Pagination)
└── types/              # TypeScript types + enum labels/colors
```

## Purchase Flow

```
WhatsApp "Shop Now" → ChatMint → POST /api/whatsapp/checkout
  → Create checkout → Create Cashfree link → Send WA payment_link template
  → Customer pays → Cashfree webhook → Verify signature → Mark SUCCESS
  → Create Shopify order (async, with retry) → Send WA payment_confirmation
  → Shopify fulfills → Fulfillment webhook → Send WA tracking_info
```

## Key Rules

- **This app is the source of truth**, not Shopify — Shopify mirrors orders
- **Never create Shopify orders before payment verification** via webhook
- **Webhook handlers must be idempotent** (idempotencyKey in log tables)
- **All integrations are logged** to their respective log tables
- **Addresses are JSON snapshots** on the checkout (not normalized)
- **Products are soft-deleted** (active=false), never hard-deleted
- **API keys are encrypted at rest** (AES-256-GCM) — frontend only sees masked values
- **WhatsApp template names are configurable** via Settings → WhatsApp Templates

## Config Hierarchy

Integration settings load in this order:
1. Database (`integration_settings` table, encrypted) — configured via admin Settings page
2. Environment variables (`.env`) — fallback

## Required Env Vars

```
DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY
CASHFREE_APP_ID, CASHFREE_SECRET_KEY, CASHFREE_WEBHOOK_SECRET, CASHFREE_ENV
SHOPIFY_STORE_DOMAIN, SHOPIFY_ACCESS_TOKEN, SHOPIFY_WEBHOOK_SECRET
CHATMINT_API_KEY, CHATMINT_SENDER_NUMBER
WHATSAPP_INTAKE_API_KEY
```

## Documentation

- Full system architecture: `docs/SYSTEM_ARCHITECTURE.md`

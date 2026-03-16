# Casezy WhatsApp Shop

WhatsApp commerce orchestration platform — receives customer data from WhatsApp (via ChatMint), creates Cashfree payment links, creates Shopify orders after payment, and sends tracking notifications back via WhatsApp.

**Production URL:** https://whatsapp.casezy.in
**Railway Dashboard:** https://railway.com/project/87aba3ba-01b5-468d-9c85-df09b29dabc1

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth (credentials, JWT, 24h sessions) |
| Styling | Tailwind CSS + Poppins/Archivo fonts |
| Payments | Cashfree Payment Links API |
| E-commerce | Shopify Admin REST API |
| WhatsApp | ChatMint template messaging |
| Encryption | AES-256-GCM for stored API keys |
| Hosting | Railway (app + Postgres) |

---

## Purchase Flow

```
Customer on WhatsApp
  │
  ├─ ChatMint bot collects: name, email, phone, address, product
  │
  ▼
POST /api/whatsapp/checkout (x-api-key auth)
  │
  ├─ Validate payload (Zod)
  ├─ Create/find customer
  ├─ Create checkout record (CHECKOUT_CREATED)
  ├─ Create Cashfree payment link
  ├─ Send WhatsApp payment_link template
  │
  ▼
Customer pays via Cashfree link
  │
  ▼
POST /api/webhooks/cashfree (signature verified)
  │
  ├─ Verify signature, log raw payload
  ├─ Idempotency check (skip duplicates)
  ├─ Mark payment SUCCESS
  ├─ Enqueue Shopify order creation (async with retry)
  │
  ▼
Shopify order created (with retry queue, max 5 attempts)
  │
  ▼
Shopify fulfills order → adds tracking
  │
  ▼
POST /api/webhooks/shopify/fulfillment (HMAC verified)
  │
  ├─ Store tracking number, courier, URL
  ├─ Send WhatsApp tracking_info template
  │
  ▼
Customer receives tracking on WhatsApp
```

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth credentials provider
│   │   ├── whatsapp/checkout/     # WhatsApp intake endpoint (x-api-key auth)
│   │   ├── webhooks/
│   │   │   ├── cashfree/          # Payment webhook (signature verified)
│   │   │   └── shopify/fulfillment/ # Tracking webhook (HMAC verified)
│   │   ├── admin/
│   │   │   ├── dashboard/         # Dashboard metrics
│   │   │   ├── orders/            # List, detail, retry-shopify-sync
│   │   │   ├── products/          # CRUD + Shopify sync
│   │   │   ├── customers/         # Customer list with segments
│   │   │   ├── settings/          # Integration keys (encrypted)
│   │   │   ├── logs/webhooks/     # Webhook log viewer
│   │   │   ├── marketing/campaigns/ # Broadcast campaigns
│   │   │   └── export/orders/     # CSV export
│   │   └── cron/
│   │       ├── process-sync-jobs/ # Retry failed Shopify syncs
│   │       └── abandoned-cart/    # Cart recovery reminders
│   ├── admin/                     # Admin dashboard pages
│   │   ├── page.tsx               # Dashboard home
│   │   ├── login/                 # Login page
│   │   ├── orders/                # Orders list + detail
│   │   ├── products/              # Products list + create/edit
│   │   ├── customers/             # Customers list
│   │   ├── settings/              # Integration settings
│   │   ├── marketing/             # Campaign management
│   │   └── logs/                  # Webhook logs
│   └── layout.tsx                 # Root layout
├── services/
│   ├── checkout.service.ts        # WhatsApp intake → checkout → payment link
│   ├── cashfree.service.ts        # Payment link creation & status
│   ├── shopify.service.ts         # Shopify order creation via Admin API
│   ├── shopify-sync.service.ts    # Async job queue with exponential backoff
│   ├── whatsapp.service.ts        # ChatMint template messaging
│   └── logger.service.ts          # Centralized audit logging
├── lib/
│   ├── auth.ts                    # NextAuth config
│   ├── config.ts                  # DB-backed config (60s cache) + env fallback
│   ├── db.ts                      # Prisma client singleton
│   ├── encryption.ts              # AES-256-GCM encrypt/decrypt/mask
│   ├── errors.ts                  # Custom error classes
│   ├── friendly-errors.ts         # User-facing error messages
│   ├── id.ts                      # ID generators (CKO-xxx, ORD-xxx)
│   ├── integration-keys.ts        # Settings field definitions
│   └── validation/                # Zod schemas (checkout, product, webhook)
├── components/
│   ├── admin/                     # Sidebar, tables, forms, metrics
│   └── shared/                    # Toast, Pagination, StatusBadge, Skeleton
├── types/                         # TypeScript types (cashfree, shopify, whatsapp, enums)
└── middleware.ts                   # Auth guard for /admin routes
```

---

## Database Schema

### Core Models

| Model | Purpose |
|-------|---------|
| `AdminUser` | Admin credentials (email + bcrypt password) |
| `Customer` | Customer profiles (phone, email, fullName) — created via WhatsApp |
| `Product` | Catalog (name, price, SKU, Shopify product/variant IDs) |
| `Checkout` | The main order record — links customer + product, stores addresses as JSON snapshots, tracks payment + order status, Cashfree + Shopify IDs |

### Enums

**PaymentStatus:** `PENDING` → `SUCCESS` / `FAILED` / `EXPIRED` / `REFUNDED`

**OrderStatus:** `CHECKOUT_CREATED` → `PAYMENT_LINK_SENT` → `PAYMENT_SUCCESS` → `SHOPIFY_ORDER_CREATED` → `TRACKING_ADDED` → `SHIPPED` → `CUSTOMER_NOTIFIED`

### Job Queue & Logging

| Model | Purpose |
|-------|---------|
| `ShopifySyncJob` | Async queue with exponential backoff (max 5 retries) |
| `WhatsappInboundLog` | Raw incoming WhatsApp payloads |
| `WhatsappOutboundLog` | Outgoing WhatsApp messages + status |
| `CashfreeWebhookLog` | Raw Cashfree webhooks (idempotency tracked) |
| `ShopifyWebhookLog` | Raw Shopify webhooks (idempotency tracked) |
| `ShopifySyncLog` | Shopify order creation attempts + errors |
| `AuditLog` | Admin actions (settings changes, product edits, etc.) |

### Settings & Marketing

| Model | Purpose |
|-------|---------|
| `IntegrationSetting` | Encrypted API keys (AES-256-GCM), configurable via admin UI |
| `MarketingCampaign` | Broadcast WhatsApp campaigns |
| `CampaignMessage` | Individual messages within a campaign |
| `AbandonedCartReminder` | Auto cart recovery (1h, 6h, 24h reminders) |

---

## API Endpoints

### Public (authenticated by API key or webhook signature)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/whatsapp/checkout` | `x-api-key` header | Receive customer data from ChatMint |
| POST | `/api/webhooks/cashfree` | Signature verification | Cashfree payment events |
| POST | `/api/webhooks/shopify/fulfillment` | HMAC verification | Shopify tracking updates |
| GET | `/api/cron/process-sync-jobs` | Bearer token / query key | Retry failed Shopify syncs |
| GET | `/api/cron/abandoned-cart` | Bearer token / query key | Send cart reminders |

### Admin (requires NextAuth session)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/dashboard` | Dashboard metrics + revenue |
| GET | `/api/admin/orders` | List orders (paginated, filterable) |
| GET | `/api/admin/orders/:id` | Order detail with logs |
| POST | `/api/admin/orders/:id/retry-shopify-sync` | Retry failed Shopify sync |
| GET/POST | `/api/admin/products` | List / create products |
| PUT/DELETE | `/api/admin/products/:id` | Update / soft-delete product |
| POST | `/api/admin/products/sync-shopify` | Bulk import from Shopify |
| GET | `/api/admin/customers` | Customer list with segments |
| GET/PUT | `/api/admin/settings` | Read / update integration keys |
| GET | `/api/admin/logs/webhooks` | Cashfree + Shopify webhook logs |
| GET/POST | `/api/admin/marketing/campaigns` | Campaign management |
| POST | `/api/admin/marketing/campaigns/:id/send` | Execute campaign |
| GET | `/api/admin/export/orders` | Download orders as CSV |

---

## WhatsApp Intake Payload

```json
POST /api/whatsapp/checkout
Headers: { "x-api-key": "your-intake-key", "Content-Type": "application/json" }

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+919999999999",
  "shipping_address": {
    "line1": "123 Main Street",
    "line2": "Near Mall",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "country": "India"
  },
  "billing_address": {
    "line1": "123 Main Street",
    "city": "Delhi",
    "state": "Delhi",
    "pincode": "110001",
    "country": "India"
  },
  "product_id": "cuid_product_id",
  "quantity": 1,
  "whatsapp_contact_id": "wa_123456"
}
```

**Response (201):**
```json
{
  "checkout_id": "CKO-A3F8K2B1",
  "order_reference": "ORD-7D2E9C4F",
  "payment_link": "https://payments.cashfree.com/links/ORD-7D2E9C4F",
  "message_sent": true,
  "status": "PAYMENT_LINK_SENT"
}
```

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Steps

```bash
# 1. Clone
git clone https://github.com/sanchitkakkar099/casezywhatsappshop.git
cd casezywhatsappshop

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables below)

# 4. Create database
createdb casezy_whatsapp_shop

# 5. Push schema to database
npx prisma db push

# 6. Seed admin user + sample product
npm run db:seed

# 7. Start dev server
npm run dev
# Open http://localhost:3000/admin/login
```

### Default Admin Credentials

```
Email:    order@casezy.in
Password: 1234
```

**Change these immediately for production.**

### NPM Scripts

```bash
npm run dev              # Dev server (http://localhost:3000)
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Create migration (dev)
npm run db:migrate:prod  # Deploy migration (production)
npm run db:push          # Push schema directly (dev only)
npm run db:seed          # Seed admin + sample product
npm run db:studio        # Open Prisma Studio (DB browser)
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/casezy_whatsapp_shop"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<openssl rand -base64 32>"

# Encryption (for API key storage)
ENCRYPTION_KEY="<openssl rand -hex 32>"

# Cashfree
CASHFREE_APP_ID="your_app_id"
CASHFREE_SECRET_KEY="your_secret_key"
CASHFREE_WEBHOOK_SECRET="your_webhook_secret"
CASHFREE_ENV="sandbox"  # or "production"

# Shopify
SHOPIFY_STORE_DOMAIN="yourstore.myshopify.com"
SHOPIFY_ACCESS_TOKEN="shpat_xxxxx"
SHOPIFY_WEBHOOK_SECRET="your_webhook_secret"
SHOPIFY_API_VERSION="2024-01"

# ChatMint (WhatsApp)
CHATMINT_API_URL="https://backend.chatmint.in/api"
CHATMINT_API_KEY="your_api_key"
CHATMINT_SENDER_NUMBER="919999999999"

# App
APP_URL="http://localhost:3000"
WHATSAPP_INTAKE_API_KEY="<openssl rand -hex 24>"
```

> **Note:** Integration keys (Cashfree, Shopify, ChatMint) can also be configured via the admin Settings page. DB settings take priority over env vars.

---

## Config Hierarchy

Integration settings load in this order:

1. **Database** (`integration_settings` table, AES-256-GCM encrypted) — set via admin Settings page
2. **Environment variables** (`.env`) — fallback if DB has no value

Both are cached for 60 seconds in memory.

---

## Deployment (Railway)

The app is deployed on Railway with auto-deploy from GitHub `main` branch.

| Service | Type |
|---------|------|
| `web-app` | Next.js app (connected to GitHub repo) |
| `Postgres` | PostgreSQL database |

### Deploy a new version

```bash
git push origin main
# Railway auto-deploys
```

### Run migrations on Railway DB

```bash
DATABASE_URL="<railway-public-db-url>" npx prisma db push
```

### Seed Railway DB

```bash
DATABASE_URL="<railway-public-db-url>" npx tsx prisma/seed.ts
```

---

## External Service Setup

### ChatMint (WhatsApp)

1. Create bot flow in ChatMint that collects customer info
2. Add webhook action at end of flow pointing to `POST /api/whatsapp/checkout`
3. Set `x-api-key` header with your `WHATSAPP_INTAKE_API_KEY`
4. Create WhatsApp message templates in ChatMint:
   - `payment_link` — sent when checkout created
   - `payment_confirmation` — sent after payment success
   - `tracking_info` — sent when tracking added
   - `abandoned_cart` — sent for cart recovery
5. Configure template names in admin Settings → ChatMint → WhatsApp Templates

### Cashfree

1. Get API credentials from Cashfree Dashboard → Developers → API Keys
2. Add webhook URL: `https://whatsapp.casezy.in/api/webhooks/cashfree`
3. Select events: `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`
4. Enter credentials in admin Settings → Cashfree

### Shopify

1. Create custom app in Shopify Admin → Settings → Apps → Develop apps
2. Enable scopes: `write_orders`, `read_orders`, `write_products`, `read_products`, `read_fulfillments`
3. Install app and copy Admin API access token
4. Add fulfillment webhook: `https://whatsapp.casezy.in/api/webhooks/shopify/fulfillment`
5. Enter credentials in admin Settings → Shopify
6. Sync products via Products page → "Sync from Shopify" button

---

## Key Architecture Decisions

- **This app is the source of truth** — Shopify only mirrors orders
- **Never create Shopify orders before payment verification** via webhook
- **Webhook handlers are idempotent** — tracked via `idempotencyKey` in log tables
- **API keys encrypted at rest** (AES-256-GCM) — admin UI only sees masked values
- **Shopify sync has retry queue** — exponential backoff, max 5 attempts
- **Addresses are JSON snapshots** on checkout — not normalized
- **Products are soft-deleted** (`active = false`), never hard-deleted
- **WhatsApp template names are configurable** — no code changes needed to switch templates

---

## Cron Jobs

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/process-sync-jobs` | Every 5 min | Retry failed Shopify order creation |
| `/api/cron/abandoned-cart` | Every 15 min | Send payment reminders (1h, 6h, 24h) |

Configured in `vercel.json` for Vercel, or use Railway cron / external cron service.

---

## Useful Commands

```bash
# Open database browser
npx prisma studio

# Check deployment logs
railway logs

# Check service status
railway service status

# Connect to Railway Postgres
railway connect Postgres
```

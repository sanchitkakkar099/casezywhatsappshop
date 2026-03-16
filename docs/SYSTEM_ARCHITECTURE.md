# Casezy WhatsApp Shop — System Architecture

## Overview

Casezy WhatsApp Shop is a WhatsApp commerce orchestration platform. It receives customer purchase intent from WhatsApp (via ChatMint), creates payment links (via Cashfree), creates orders in Shopify after payment, and sends transactional notifications back to the customer on WhatsApp.

**This custom web app is the source of truth**, not Shopify. Shopify is used purely for fulfillment and inventory management.

---

## Complete Purchase Flow

```
Customer (WhatsApp)
    │
    ▼
1. "Shop Now" on WhatsApp ──────────────────────────────────┐
    │                                                        │
    ▼                                                        │
2. ChatMint sends customer data ──► POST /api/whatsapp/checkout
    │                                   │
    │                                   ├─ Validate product (active?)
    │                                   ├─ Upsert customer by phone
    │                                   ├─ Create Checkout record
    │                                   ├─ Create Cashfree payment link
    │                                   └─ Send WhatsApp "payment_link" template
    │
    ▼
3. Customer receives payment link on WhatsApp
    │
    ▼
4. Customer pays via Cashfree hosted page
    │
    ▼
5. Cashfree webhook ──────────────► POST /api/webhooks/cashfree
    │                                   │
    │                                   ├─ Verify HMAC signature
    │                                   ├─ Idempotency check
    │                                   ├─ Update checkout: paymentStatus = SUCCESS
    │                                   ├─ Enqueue Shopify sync job
    │                                   └─ Process sync job (async)
    │                                         │
    │                                         ├─ Create Shopify order (financial_status: paid)
    │                                         ├─ Update checkout with Shopify order ID
    │                                         └─ Send WhatsApp "payment_confirmation" template
    │
    ▼
6. Order appears in Shopify admin for fulfillment
    │
    ▼
7. Shopify fulfillment webhook ──► POST /api/webhooks/shopify/fulfillment
    │                                   │
    │                                   ├─ Verify HMAC signature
    │                                   ├─ Extract tracking details
    │                                   ├─ Update checkout with tracking info
    │                                   └─ Send WhatsApp "tracking_info" template
    │
    ▼
8. Customer receives tracking info on WhatsApp
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (credentials, JWT strategy, 24h sessions) |
| Styling | Tailwind CSS |
| Payments | Cashfree Payment Gateway |
| E-commerce | Shopify Admin API |
| WhatsApp | ChatMint (chatmint.in) — WhatsApp Business API provider |

---

## Project Structure

```
src/
├── app/
│   ├── admin/              # Admin dashboard (protected)
│   │   ├── layout.tsx      # Sidebar + SessionProvider wrapper
│   │   ├── page.tsx        # Dashboard with revenue + metrics
│   │   ├── login/          # Login page (no sidebar)
│   │   ├── orders/         # Order list + detail pages
│   │   ├── products/       # Product CRUD pages
│   │   ├── logs/           # Webhook log viewer
│   │   └── settings/       # Integration config + setup guides
│   ├── api/
│   │   ├── admin/          # Admin API routes (auth required)
│   │   │   ├── dashboard/  # GET — metrics, revenue, WhatsApp stats
│   │   │   ├── orders/     # Order management
│   │   │   ├── products/   # Product CRUD
│   │   │   ├── settings/   # GET/PUT integration settings (encrypted)
│   │   │   ├── logs/       # Webhook logs
│   │   │   └── export/     # CSV export
│   │   ├── webhooks/
│   │   │   ├── cashfree/   # Payment webhook (signature verified)
│   │   │   └── shopify/    # Fulfillment webhook (HMAC verified)
│   │   ├── whatsapp/
│   │   │   └── checkout/   # WhatsApp intake endpoint (API key auth)
│   │   └── cron/
│   │       └── process-sync-jobs/  # Retry failed Shopify syncs
│   └── globals.css
├── components/
│   ├── admin/              # Dashboard, Sidebar, tables, forms
│   └── shared/             # StatusBadge, Pagination, ExportButton
├── services/
│   ├── checkout.service.ts     # Intake → checkout creation flow
│   ├── cashfree.service.ts     # Payment link creation
│   ├── shopify.service.ts      # Shopify order creation
│   ├── shopify-sync.service.ts # Async job queue with retry
│   ├── whatsapp.service.ts     # ChatMint template messaging
│   └── logger.service.ts       # Centralized audit logging
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   ├── config.ts           # Env config + DB-backed async getter
│   ├── db.ts               # Prisma client singleton
│   ├── encryption.ts       # AES-256-GCM encrypt/decrypt/mask
│   ├── errors.ts           # Custom error classes + error response handler
│   ├── id.ts               # ID generators (checkout, order ref)
│   ├── integration-keys.ts # Integration field definitions + defaults
│   └── validation/         # Zod schemas
├── types/                  # TypeScript type definitions
└── middleware.ts            # Auth middleware for /admin/* routes
```

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `admin_users` | Admin credentials (email + bcrypt password) |
| `customers` | Customer records, keyed by phone (unique WhatsApp ID) |
| `products` | Product catalog with Shopify variant mappings |
| `checkouts` | **Central order record** — tracks entire lifecycle |
| `integration_settings` | Encrypted API keys and config (AES-256-GCM) |

### Job & Log Tables

| Table | Purpose |
|-------|---------|
| `shopify_sync_jobs` | Queue for Shopify order creation with exponential backoff retry |
| `whatsapp_inbound_logs` | All incoming WhatsApp intake payloads |
| `whatsapp_outbound_logs` | All outbound WhatsApp messages (status, errors) |
| `cashfree_webhook_logs` | Payment webhook events (idempotency key) |
| `shopify_webhook_logs` | Fulfillment webhook events (idempotency key) |
| `shopify_sync_logs` | Shopify API request/response audit trail |
| `audit_logs` | General system audit (settings changes, etc.) |

### Checkout Lifecycle (Status Flow)

```
CHECKOUT_CREATED
    → PAYMENT_LINK_SENT (WhatsApp message sent)
    → PAYMENT_PENDING
    → PAYMENT_SUCCESS / PAYMENT_FAILED
    → SHOPIFY_ORDER_CREATED / SHOPIFY_SYNC_FAILED
    → FULFILLMENT_PENDING
    → TRACKING_ADDED
    → SHIPPED
    → CUSTOMER_NOTIFIED
```

---

## Integration Configuration

### Config Hierarchy

The system loads integration settings in this order:

1. **Database** (`integration_settings` table) — encrypted at rest with AES-256-GCM
2. **Environment variables** (`.env` file) — fallback if not configured in DB

Settings are cached for 60 seconds in memory. Cache is cleared when settings are updated via the admin UI.

### Security

- All API keys are encrypted with AES-256-GCM before database storage
- Frontend never receives full key values — only masked versions (last 4 characters)
- `ENCRYPTION_KEY` env var (32-byte hex) is required for encryption
- Admin API routes require valid NextAuth session
- Webhook endpoints verify signatures (Cashfree: HMAC-SHA256, Shopify: HMAC-SHA256)
- WhatsApp intake endpoint uses API key authentication (`x-api-key` header)
- Audit log records all settings changes (keys modified, never values)

### WhatsApp Templates

The system uses 4 WhatsApp message templates, configurable via Settings:

| Setting Key | Default Template Name | Trigger |
|-------------|----------------------|---------|
| `tplPaymentLink` | `payment_link` | Checkout created with payment link |
| `tplPaymentConfirmation` | `payment_confirmation` | Payment success + Shopify order created |
| `tplTrackingInfo` | `tracking_info` | Order shipped with tracking |
| `tplOrderDelivered` | `order_delivered` | Order delivered (optional) |

Template names are configured in the admin Settings page under WhatsApp (ChatMint) → WhatsApp Templates.

---

## Key API Endpoints

### WhatsApp Intake

```
POST /api/whatsapp/checkout
Headers: x-api-key: <WHATSAPP_INTAKE_API_KEY>

Body: {
  full_name, email, phone,
  shipping_address: { line1, line2?, city, state, pincode, country },
  billing_address: { ... },
  product_id, quantity? (1-10)
}

Response: {
  checkout_id, order_reference, payment_link,
  message_sent, status
}
```

### Cashfree Webhook

```
POST /api/webhooks/cashfree
Headers: x-cashfree-timestamp, x-cashfree-signature

Handles: PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK
Always returns 200 (idempotent)
```

### Shopify Fulfillment Webhook

```
POST /api/webhooks/shopify/fulfillment
Headers: X-Shopify-Hmac-Sha256, X-Shopify-Webhook-Id

Handles: orders/fulfilled
Extracts tracking number, courier, tracking URL
```

### Admin Settings API

```
GET  /api/admin/settings         # Returns all settings (secrets masked)
PUT  /api/admin/settings         # Update settings (encrypted before storage)
     Body: { integration: "chatmint", settings: { apiKey: "..." } }
```

---

## Retry Logic (Shopify Sync)

When Shopify order creation fails, the system retries with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1st retry | 1 minute |
| 2nd retry | 5 minutes |
| 3rd retry | 30 minutes |
| 4th retry | 2 hours |
| 5th retry | 12 hours |

After 5 failed attempts, the job is marked as `FAILED` and the checkout status becomes `SHOPIFY_SYNC_FAILED`. Admin can manually retry via the order detail page.

Pending retries are processed by the cron endpoint: `GET /api/cron/process-sync-jobs`

---

## Design Principles

1. **This app is the source of truth** — Shopify mirrors orders, not the other way around
2. **Never create Shopify orders before payment verification** — webhook confirms first
3. **Idempotent webhook handlers** — duplicate events are safely ignored
4. **Non-blocking WhatsApp messaging** — message failures don't fail checkouts
5. **Products are soft-deleted** — `active=false`, never hard-deleted
6. **Addresses are JSON snapshots** — captured at checkout time, not normalized
7. **All integrations are logged** — every API call has an audit trail
8. **Secrets never leave the server** — frontend only sees masked values

# Phase 3 — Setup, Testing & Deployment Guide

---

## 1. Local Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+ (local or cloud — Supabase, Neon, Railway all work)
- A Cashfree account (sandbox first)
- A Shopify store with Admin API access
- A ChatMint account for WhatsApp messaging

### Step-by-step

```bash
# 1. Clone and install
cd casezywhatsappshop
npm install

# 2. Create your env file
cp .env.example .env.local
# Edit .env.local with your actual credentials (see section below)

# 3. Create the database
createdb casezy_whatsapp_shop
# Or use your Postgres GUI to create the database

# 4. Run migrations
npx prisma migrate dev --name init

# 5. Generate Prisma client
npx prisma generate

# 6. Seed admin user and sample product
npm run db:seed
# Creates: admin@casezy.in / admin123

# 7. Start dev server
npm run dev
# Open http://localhost:3000/admin/login
```

### Environment Variables

Fill in `.env.local` with real values:

```env
# Database — use your actual PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/casezy_whatsapp_shop?schema=public"

# NextAuth — generate a random secret: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<run: openssl rand -base64 32>"

# Cashfree — get from Cashfree dashboard > Developers > API Keys
CASHFREE_APP_ID="your_app_id"
CASHFREE_SECRET_KEY="your_secret_key"
CASHFREE_WEBHOOK_SECRET="your_webhook_secret"
CASHFREE_ENV="sandbox"  # change to "production" when going live

# Shopify — create a custom app in Shopify Admin > Settings > Apps > Develop apps
SHOPIFY_STORE_DOMAIN="your-store.myshopify.com"
SHOPIFY_ACCESS_TOKEN="shpat_xxxxx"
SHOPIFY_WEBHOOK_SECRET="your_webhook_secret"
SHOPIFY_API_VERSION="2024-01"

# ChatMint — get from your ChatMint dashboard
CHATMINT_API_URL="https://backend.chatmint.in/api"
CHATMINT_API_KEY="your_api_key"
CHATMINT_SENDER_NUMBER="your_sender_number"

# App
APP_URL="http://localhost:3000"
WHATSAPP_INTAKE_API_KEY="<run: openssl rand -hex 24>"
```

---

## 2. Database Migration Guide

### First time setup
```bash
npx prisma migrate dev --name init
```

### Adding new fields later
```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name describe_your_change

# 3. In production
npx prisma migrate deploy
```

### Useful Prisma commands
```bash
npx prisma studio          # Visual DB browser at localhost:5555
npx prisma db push          # Push schema changes without migration (dev only)
npx prisma migrate reset    # Drop DB and re-run all migrations (dev only)
```

---

## 3. Webhook Testing Guide

### Tools needed

- **ngrok** or **Cloudflare Tunnel** — to expose localhost to the internet for webhook delivery
- **curl** or **Postman** — to manually test API endpoints

### Expose localhost

```bash
# Option A: ngrok
ngrok http 3000
# Copy the https://xxx.ngrok.io URL

# Option B: Cloudflare Tunnel (if installed)
cloudflared tunnel --url http://localhost:3000
```

Update your `.env.local`:
```env
APP_URL="https://your-tunnel-url.ngrok.io"
```

### Testing the WhatsApp Intake Endpoint

```bash
curl -X POST http://localhost:3000/api/whatsapp/checkout \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_WHATSAPP_INTAKE_API_KEY" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "+919999999999",
    "shipping_address": {
      "line1": "123 Main Street",
      "line2": "Near City Mall",
      "city": "Delhi",
      "state": "Delhi",
      "pincode": "110001",
      "country": "India"
    },
    "billing_address": {
      "line1": "123 Main Street",
      "line2": "Near City Mall",
      "city": "Delhi",
      "state": "Delhi",
      "pincode": "110001",
      "country": "India"
    },
    "product_id": "REPLACE_WITH_ACTUAL_PRODUCT_ID",
    "quantity": 1,
    "whatsapp_contact_id": "wa_test_123"
  }'
```

Expected response (201):
```json
{
  "checkout_id": "CKO-A3F8K2B1",
  "order_reference": "ORD-7D2E9C4F",
  "payment_link": "https://payments.cashfree.com/links/ORD-7D2E9C4F",
  "message_sent": true,
  "status": "PAYMENT_LINK_SENT"
}
```

### Testing Cashfree Webhook (Sandbox)

In Cashfree sandbox dashboard:
1. Go to **Developers > Webhooks**
2. Set webhook URL to: `https://your-tunnel-url/api/webhooks/cashfree`
3. Use a test payment link to trigger a payment
4. Cashfree will POST the webhook to your endpoint

**Manual test with sample payload:**

```bash
# Note: signature verification will fail on manual tests unless you compute it.
# For local testing, you can temporarily skip signature check or use Cashfree sandbox.

curl -X POST http://localhost:3000/api/webhooks/cashfree \
  -H "Content-Type: application/json" \
  -H "x-cashfree-timestamp: 2024-01-01T00:00:00Z" \
  -H "x-cashfree-signature: test-skip-in-dev" \
  -d '{
    "type": "PAYMENT_SUCCESS_WEBHOOK",
    "event_time": "2024-01-01T10:00:00+05:30",
    "data": {
      "order": {
        "order_id": "ORD-7D2E9C4F",
        "order_amount": 499.00,
        "order_currency": "INR"
      },
      "payment": {
        "cf_payment_id": 123456789,
        "payment_status": "SUCCESS",
        "payment_amount": 499.00,
        "payment_currency": "INR",
        "payment_message": "Payment successful",
        "payment_time": "2024-01-01T10:00:00+05:30"
      },
      "customer_details": {
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "customer_phone": "+919999999999"
      }
    }
  }'
```

### Sample Cashfree Payment Success Webhook

```json
{
  "type": "PAYMENT_SUCCESS_WEBHOOK",
  "event_time": "2024-06-15T14:30:00+05:30",
  "data": {
    "order": {
      "order_id": "ORD-A1B2C3D4",
      "order_amount": 999.00,
      "order_currency": "INR",
      "order_tags": {
        "internal_ref": "ORD-A1B2C3D4"
      }
    },
    "payment": {
      "cf_payment_id": 987654321,
      "payment_status": "SUCCESS",
      "payment_amount": 999.00,
      "payment_currency": "INR",
      "payment_message": "Payment successful by UPI",
      "payment_time": "2024-06-15T14:30:00+05:30",
      "payment_method": {
        "upi": {
          "upi_id": "customer@upi"
        }
      }
    },
    "customer_details": {
      "customer_name": "Jane Smith",
      "customer_email": "jane@example.com",
      "customer_phone": "+918888888888"
    },
    "payment_gateway_details": {
      "gateway_name": "CASHFREE",
      "gateway_order_id": "order_abc123",
      "gateway_payment_id": "pay_xyz789"
    }
  }
}
```

### Sample Cashfree Payment Failed Webhook

```json
{
  "type": "PAYMENT_FAILED_WEBHOOK",
  "event_time": "2024-06-15T14:35:00+05:30",
  "data": {
    "order": {
      "order_id": "ORD-E5F6G7H8",
      "order_amount": 499.00,
      "order_currency": "INR"
    },
    "payment": {
      "cf_payment_id": 111222333,
      "payment_status": "FAILED",
      "payment_amount": 499.00,
      "payment_currency": "INR",
      "payment_message": "Payment failed due to insufficient funds",
      "payment_time": "2024-06-15T14:35:00+05:30"
    },
    "error_details": {
      "error_code": "TRANSACTION_DECLINED",
      "error_description": "Payment declined by bank",
      "error_reason": "insufficient_funds",
      "error_source": "bank"
    }
  }
}
```

### Testing Shopify Fulfillment Webhook

In Shopify Admin:
1. Go to **Settings > Notifications > Webhooks**
2. Add webhook:
   - Event: `Order fulfillment`
   - URL: `https://your-tunnel-url/api/webhooks/shopify/fulfillment`
   - Format: JSON
3. Copy the webhook signing secret to `SHOPIFY_WEBHOOK_SECRET`

**Sample Shopify Fulfillment Webhook Payload:**

```json
{
  "id": 5555666777,
  "order_id": 4444333222,
  "status": "success",
  "tracking_company": "Delhivery",
  "tracking_number": "DL1234567890",
  "tracking_numbers": ["DL1234567890"],
  "tracking_url": "https://www.delhivery.com/track/package/DL1234567890",
  "tracking_urls": ["https://www.delhivery.com/track/package/DL1234567890"],
  "created_at": "2024-06-16T10:00:00+05:30",
  "updated_at": "2024-06-16T10:00:00+05:30",
  "line_items": [
    {
      "id": 11112222,
      "variant_id": 43210987654321,
      "title": "Premium Phone Case",
      "quantity": 1
    }
  ]
}
```

### Verifying Webhooks Were Processed

After triggering any webhook, check:

1. **Admin Dashboard** → `/admin` — metrics should update
2. **Order Detail** → `/admin/orders/{id}` — status, activity log
3. **Webhook Logs** → `/admin/logs` — raw payloads, signature validity, processed flag
4. **Prisma Studio** → `npx prisma studio` — inspect DB tables directly

---

## 4. Admin Login & Seed

### Default admin credentials

```
Email:    admin@casezy.in
Password: admin123
```

**Change the password immediately in production** by either:

A. Updating the seed file and re-running it:
```bash
# Edit prisma/seed.ts — change "admin123" to your real password
npm run db:seed
```

B. Or directly in Prisma Studio / SQL:
```sql
-- Generate hash with: node -e "require('bcryptjs').hash('YourNewPassword', 12).then(console.log)"
UPDATE admin_users SET hashed_password = '$2a$12$...' WHERE email = 'admin@casezy.in';
```

### Adding more admin users

Edit `prisma/seed.ts` to add more users, or add an admin user management page later.

---

## 5. Deployment Notes

### Recommended hosting

| Component | Recommendation |
|---|---|
| App | **Vercel** (native Next.js support) or **Railway** |
| Database | **Supabase** (free tier), **Neon**, or **Railway Postgres** |
| Domain | Point your domain to Vercel/Railway |

### Vercel deployment

```bash
# 1. Push code to GitHub

# 2. Connect repo to Vercel
# In Vercel dashboard: New Project > Import from GitHub

# 3. Set environment variables in Vercel dashboard
# Add ALL variables from .env.example

# 4. Set build command (Vercel auto-detects Next.js)
# Build: npm run build
# Install: npm install

# 5. Add postinstall script for Prisma
# In package.json, add:
#   "postinstall": "prisma generate"

# 6. Run migration on first deploy
# In Vercel terminal or locally with production DATABASE_URL:
npx prisma migrate deploy
npm run db:seed
```

### Railway deployment

```bash
# 1. Connect repo to Railway
# 2. Add PostgreSQL service
# 3. Railway auto-sets DATABASE_URL
# 4. Add all other env vars
# 5. Set start command: npm run build && npm start
```

### Post-deployment checklist

- [ ] Set `CASHFREE_ENV=production` and use production API keys
- [ ] Set `APP_URL` to your production domain
- [ ] Set `NEXTAUTH_URL` to your production domain
- [ ] Generate a strong `NEXTAUTH_SECRET`
- [ ] Generate a strong `WHATSAPP_INTAKE_API_KEY`
- [ ] Change admin password from default
- [ ] Configure Cashfree webhook URL to production domain
- [ ] Configure Shopify webhook URL to production domain
- [ ] Share `WHATSAPP_INTAKE_API_KEY` with your WhatsApp automation tool
- [ ] Test end-to-end: WhatsApp → Checkout → Payment → Shopify order

---

## 6. Production Hardening Checklist

### Security

- [x] Webhook signature verification (Cashfree + Shopify)
- [x] API key authentication on WhatsApp intake
- [x] Session-based admin auth (NextAuth)
- [x] Input validation with Zod on all endpoints
- [x] Admin routes protected by middleware
- [x] No secrets in client-side code
- [x] Idempotent webhook handlers
- [ ] **TODO: Add rate limiting** — use `next-rate-limit` or Vercel's built-in rate limiting
- [ ] **TODO: Add CORS headers** — restrict `/api/whatsapp/checkout` to known origins if needed
- [ ] **TODO: Add CSP headers** — Content Security Policy for admin pages
- [ ] **TODO: HTTPS only** — enforced by Vercel/Railway by default

### Rate Limiting (add when ready)

Install: `npm install next-rate-limit`

Add to webhook routes:
```typescript
// In each webhook route, add at the top:
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

// In handler:
try {
  await limiter.check(10, 'WEBHOOK'); // 10 requests per minute
} catch {
  return Response.json({ error: 'Rate limited' }, { status: 429 });
}
```

### Monitoring

- [ ] **TODO: Add error tracking** — Sentry (`npm install @sentry/nextjs`)
- [ ] **TODO: Add uptime monitoring** — BetterUptime or UptimeRobot on webhook endpoints
- [ ] **TODO: Add log aggregation** — Vercel Logs or Axiom for structured logs
- [ ] Check Prisma Studio or DB for stuck checkouts (`payment_status = PENDING` older than 24h)

### Database

- [ ] Enable connection pooling (PgBouncer on Supabase, built-in on Neon)
- [ ] Set up automated daily backups
- [ ] Add DB indexes as query patterns emerge (current indexes cover expected patterns)
- [ ] Prune old log entries after 90 days (cron job)

---

## 7. ChatMint WhatsApp Setup

### Template Messages

You need to create these WhatsApp template messages in your ChatMint dashboard (they require Meta approval):

**Template 1: `payment_link`**
```
Hi {{1}}, your order for {{2}} of {{3}} is ready!

Complete your payment here: {{4}}

This link expires in 24 hours.
```
Parameters: `[customerName, productName, amount, linkUrl]`

**Template 2: `payment_confirmation`**
```
Hi {{1}}, we've received your payment of {{2}} for order {{3}}.

Your order is being processed. We'll share tracking details once shipped!
```
Parameters: `[customerName, amount, orderRef]`

**Template 3: `tracking_info`**
```
Hi {{1}}, your order {{2}} has been shipped!

Courier: {{3}}
Tracking Number: {{4}}
Track here: {{5}}
```
Parameters: `[customerName, orderRef, courierName, trackingNumber, trackingUrl]`

### ChatMint API Integration

The `whatsapp.service.ts` calls ChatMint's API at:
```
POST {CHATMINT_API_URL}/send-template
Authorization: Bearer {CHATMINT_API_KEY}
```

**If ChatMint's actual API structure differs**, update the `sendChatMintMessage` function in `src/services/whatsapp.service.ts`. The rest of the app stays the same — only the transport layer changes.

---

## 8. Shopify Setup

### Create a Custom App

1. In Shopify Admin → **Settings** → **Apps and sales channels** → **Develop apps**
2. Click **Create an app** → name it "Casezy WhatsApp"
3. Under **API access scopes**, enable:
   - `write_orders` (create orders)
   - `read_orders` (read orders)
   - `write_customers` (create/update customers)
   - `read_products` (verify product/variant IDs)
4. Install the app → copy the **Admin API access token** → set as `SHOPIFY_ACCESS_TOKEN`

### Register Fulfillment Webhook

1. In Shopify Admin → **Settings** → **Notifications** → scroll to **Webhooks**
2. Click **Create webhook**:
   - Event: **Order fulfillment**
   - Format: JSON
   - URL: `https://your-domain.com/api/webhooks/shopify/fulfillment`
3. Copy the **signing secret** → set as `SHOPIFY_WEBHOOK_SECRET`

### Map Products

For each product you sell via WhatsApp:
1. In Shopify Admin, note the **Product ID** and **Variant ID** (visible in the URL when editing a variant)
2. In your admin dashboard → **Products** → Edit product
3. Enter the Shopify Product ID and Variant ID

---

## 9. Cashfree Setup

### Get API Credentials

1. Log into [Cashfree Dashboard](https://merchant.cashfree.com)
2. Go to **Developers** → **API Keys**
3. Copy App ID and Secret Key
4. For sandbox, use [sandbox.cashfree.com](https://sandbox.cashfree.com)

### Configure Webhooks

1. Go to **Developers** → **Webhooks** → **Payment Links**
2. Add webhook URL: `https://your-domain.com/api/webhooks/cashfree`
3. Select events: `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`
4. Copy the webhook secret → set as `CASHFREE_WEBHOOK_SECRET`

### Test in Sandbox

Cashfree sandbox provides test card numbers:
- Success: `4111 1111 1111 1111` (any expiry, any CVV)
- Failure: `4111 1111 1111 1234`

---

## 10. End-to-End Testing Sequence

Run this sequence to verify everything works:

### Step 1: Create a product in admin
1. Login at `/admin/login`
2. Go to Products → Add Product
3. Create with: name, slug, price, Shopify variant ID mapped

### Step 2: Simulate WhatsApp checkout
```bash
curl -X POST https://your-domain.com/api/whatsapp/checkout \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_KEY" \
  -d '{ ... payload from section 3 above ... }'
```
Verify: checkout appears in admin, payment link generated

### Step 3: Complete payment
1. Open the payment link URL from the response
2. Pay with Cashfree test card
3. Cashfree sends webhook to your app

Verify: payment status = SUCCESS, Shopify order created, order visible in Shopify Admin

### Step 4: Fulfill in Shopify
1. In Shopify Admin, find the order
2. Mark as fulfilled, add tracking number
3. Shopify sends fulfillment webhook

Verify: tracking info appears in admin, WhatsApp notification sent (check ChatMint logs)

---

## 11. Future Improvements

### Short-term (recommended soon)
- **Cron job for stuck sync jobs** — A `/api/cron/process-sync-jobs` route called every 5 minutes via Vercel Cron or external cron to process pending Shopify sync jobs with exponential backoff
- **Reconciliation endpoint** — Checks Cashfree for payments on checkouts stuck in PENDING for >1h
- **Admin user management** — Add/remove admin users from the dashboard
- **Password change** — Self-service password change for admins

### Medium-term
- **Bulk product import** — CSV upload for products with Shopify mapping
- **Order timeline** — Visual timeline of all status changes for each order
- **Discount/coupon support** — Apply discounts before creating Cashfree link
- **Multi-product checkout** — Cart with multiple products in one checkout
- **Customer lookup** — Search by phone to see all orders for a customer
- **Dashboard charts** — Revenue over time, daily order count, conversion rate

### Long-term
- **Automated WhatsApp follow-ups** — Remind customer if payment link not used within 2h
- **Inventory sync with Shopify** — Disable products when out of stock
- **Returns/refund workflow** — Handle Cashfree refunds + Shopify order cancellation
- **Multi-store support** — Manage multiple Shopify stores from one admin
- **Role-based admin access** — Viewer vs editor roles
- **API documentation** — OpenAPI/Swagger spec for the WhatsApp intake endpoint

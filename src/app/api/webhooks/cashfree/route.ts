import { NextRequest } from "next/server";
import { getIntegrationConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { verifyCashfreeSignature } from "@/lib/validation/webhook";
import { loggerService } from "@/services/logger.service";
import { enqueueShopifySync } from "@/services/shopify-sync.service";
import type { CashfreeWebhookEvent } from "@/types/cashfree";

// Payment event types we actually process
const PAYMENT_EVENTS = [
  "PAYMENT_SUCCESS_WEBHOOK",
  "PAYMENT_FAILED_WEBHOOK",
  "PAYMENT_USER_DROPPED_WEBHOOK",
];

/**
 * POST /api/webhooks/cashfree
 *
 * Receives all webhook events from Cashfree (payment events, alerts, etc).
 * Only processes payment-related events. Non-payment events are logged and acknowledged.
 * Must always return 200 to prevent retries.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let body: Record<string, unknown>;

  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error("Cashfree webhook: invalid JSON body");
    return Response.json({ status: "error", message: "Invalid JSON" }, { status: 200 });
  }

  // Determine event type — Cashfree uses "type" for payment webhooks,
  // "event" for account alerts (LOW_BALANCE_ALERT, etc.)
  const eventType = (body.type as string) ?? (body.event as string) ?? "UNKNOWN";

  // Skip non-payment events (LOW_BALANCE_ALERT, etc.)
  if (!PAYMENT_EVENTS.includes(eventType)) {
    console.log(`Cashfree webhook: ignoring non-payment event "${eventType}"`);
    return Response.json({ status: "ignored", event: eventType }, { status: 200 });
  }

  // From here on, treat as a payment webhook
  const event = body as unknown as CashfreeWebhookEvent;
  const timestamp = request.headers.get("x-cashfree-timestamp") ?? "";
  const signature = request.headers.get("x-cashfree-signature") ?? "";

  // Verify signature
  let signatureValid = false;
  try {
    const webhookSecret = await getIntegrationConfig("cashfree", "webhookSecret");
    signatureValid = verifyCashfreeSignature(
      rawBody,
      timestamp,
      signature,
      webhookSecret
    );
  } catch {
    signatureValid = false;
  }

  const cashfreeOrderId = event.data?.order?.order_id;
  const cfPaymentId = event.data?.payment?.cf_payment_id;

  // Log raw webhook (always, even if signature fails)
  const idempotencyKey = cashfreeOrderId && cfPaymentId
    ? `${cashfreeOrderId}_${eventType}_${cfPaymentId}`
    : `${eventType}_${Date.now()}`;

  await loggerService.logCashfreeWebhook({
    eventType,
    cashfreeOrderId,
    payload: event,
    signatureValid,
    idempotencyKey,
  });

  if (!signatureValid) {
    console.error("Cashfree webhook: invalid signature");
    return Response.json({ status: "signature_invalid" }, { status: 200 });
  }

  if (!cashfreeOrderId) {
    console.error("Cashfree webhook: missing order_id");
    return Response.json({ status: "missing_order_id" }, { status: 200 });
  }

  // Idempotency check — have we already processed this exact event?
  const existing = await db.cashfreeWebhookLog.findUnique({
    where: { idempotencyKey },
  });

  if (existing?.processed) {
    return Response.json({ status: "already_processed" }, { status: 200 });
  }

  // Find checkout by cashfreeOrderId (which is our internal_order_reference)
  const checkout = await db.checkout.findUnique({
    where: { cashfreeOrderId },
    include: { customer: true, product: true },
  });

  if (!checkout) {
    console.error(`Cashfree webhook: checkout not found for order ${cashfreeOrderId}`);
    return Response.json({ status: "checkout_not_found" }, { status: 200 });
  }

  // Handle payment success
  if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || event.data?.payment?.payment_status === "SUCCESS") {
    // Skip if already marked as success (handles duplicate webhooks)
    if (checkout.paymentStatus === "SUCCESS") {
      await db.cashfreeWebhookLog.updateMany({
        where: { idempotencyKey },
        data: { processed: true },
      });
      return Response.json({ status: "already_success" }, { status: 200 });
    }

    // Update checkout: payment success
    await db.checkout.update({
      where: { id: checkout.id },
      data: {
        paymentStatus: "SUCCESS",
        orderStatus: "PAYMENT_SUCCESS",
        cashfreePaymentId: String(event.data.payment.cf_payment_id),
        paidAt: new Date(event.data.payment.payment_time),
      },
    });

    // Enqueue Shopify order creation
    const job = await enqueueShopifySync(checkout.id);

    // Process the sync job immediately (fire-and-forget)
    const { processShopifySyncJob } = await import("@/services/shopify-sync.service");
    processShopifySyncJob(job.id).catch((err) => {
      console.error("Shopify sync error (async):", err);
    });

  // Handle payment failure
  } else if (
    eventType === "PAYMENT_FAILED_WEBHOOK" ||
    eventType === "PAYMENT_USER_DROPPED_WEBHOOK" ||
    event.data?.payment?.payment_status === "FAILED"
  ) {
    if (checkout.paymentStatus !== "PENDING") {
      // Don't overwrite SUCCESS with FAILED
      await db.cashfreeWebhookLog.updateMany({
        where: { idempotencyKey },
        data: { processed: true },
      });
      return Response.json({ status: "status_not_pending" }, { status: 200 });
    }

    await db.checkout.update({
      where: { id: checkout.id },
      data: {
        paymentStatus: "FAILED",
        orderStatus: "PAYMENT_FAILED",
        cashfreePaymentId: String(event.data?.payment?.cf_payment_id ?? ""),
      },
    });
  }

  // Mark webhook as processed
  await db.cashfreeWebhookLog.updateMany({
    where: { idempotencyKey },
    data: { processed: true },
  });

  return Response.json({ status: "ok" }, { status: 200 });
}

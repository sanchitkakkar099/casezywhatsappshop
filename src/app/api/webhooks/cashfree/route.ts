import { NextRequest } from "next/server";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { verifyCashfreeSignature } from "@/lib/validation/webhook";
import { loggerService } from "@/services/logger.service";
import { enqueueShopifySync } from "@/services/shopify-sync.service";
import { whatsappService } from "@/services/whatsapp.service";
import type { CashfreeWebhookEvent } from "@/types/cashfree";

/**
 * POST /api/webhooks/cashfree
 *
 * Receives payment events from Cashfree.
 * Must always return 200 to prevent retries (even on errors).
 *
 * Key behaviors:
 * - Verifies webhook signature
 * - Idempotent: duplicate events are safely ignored
 * - Updates payment status
 * - Triggers Shopify sync on success
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let event: CashfreeWebhookEvent;

  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error("Cashfree webhook: invalid JSON body");
    return Response.json({ status: "error", message: "Invalid JSON" }, { status: 200 });
  }

  const timestamp = request.headers.get("x-cashfree-timestamp") ?? "";
  const signature = request.headers.get("x-cashfree-signature") ?? "";

  // Verify signature
  let signatureValid = false;
  try {
    signatureValid = verifyCashfreeSignature(
      rawBody,
      timestamp,
      signature,
      config.cashfree.webhookSecret
    );
  } catch {
    signatureValid = false;
  }

  const eventType = event.type ?? "UNKNOWN";
  const cashfreeOrderId = event.data?.order?.order_id;

  // Log raw webhook (always, even if signature fails)
  await loggerService.logCashfreeWebhook({
    eventType,
    cashfreeOrderId,
    payload: event,
    signatureValid,
    idempotencyKey: `${cashfreeOrderId}_${eventType}_${event.data?.payment?.cf_payment_id}`,
  });

  if (!signatureValid) {
    console.error("Cashfree webhook: invalid signature");
    // Return 200 to prevent retries — we've logged the bad payload
    return Response.json({ status: "signature_invalid" }, { status: 200 });
  }

  if (!cashfreeOrderId) {
    console.error("Cashfree webhook: missing order_id");
    return Response.json({ status: "missing_order_id" }, { status: 200 });
  }

  // Idempotency check — have we already processed this exact event?
  const idempotencyKey = `${cashfreeOrderId}_${eventType}_${event.data?.payment?.cf_payment_id}`;
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

  // Handle payment events
  if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || event.data?.payment?.payment_status === "SUCCESS") {
    // Skip if already marked as success (handles duplicate webhooks)
    if (checkout.paymentStatus === "SUCCESS") {
      // Mark this webhook log as processed
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

    // Process the sync job immediately (async, but we don't wait for it to respond to webhook)
    // Using a fire-and-forget pattern here — errors are caught inside processShopifySyncJob
    const { processShopifySyncJob } = await import("@/services/shopify-sync.service");
    processShopifySyncJob(job.id).catch((err) => {
      console.error("Shopify sync error (async):", err);
    });

  } else if (
    eventType === "PAYMENT_FAILED_WEBHOOK" ||
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
        cashfreePaymentId: String(event.data.payment.cf_payment_id),
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

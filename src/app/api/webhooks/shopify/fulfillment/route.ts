import { NextRequest } from "next/server";
import { getIntegrationConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { verifyShopifyHmac } from "@/lib/validation/webhook";
import { loggerService } from "@/services/logger.service";
import { whatsappService } from "@/services/whatsapp.service";
import type { ShopifyFulfillmentWebhook } from "@/types/shopify";

/**
 * POST /api/webhooks/shopify/fulfillment
 *
 * Receives fulfillment/tracking updates from Shopify.
 * Updates local checkout with tracking details and notifies customer.
 *
 * Shopify webhook topic: orders/fulfilled
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256") ?? "";
  const topic = request.headers.get("X-Shopify-Topic") ?? "orders/fulfilled";
  const webhookId = request.headers.get("X-Shopify-Webhook-Id") ?? "";

  // Verify HMAC
  let hmacValid = false;
  try {
    const webhookSecret = await getIntegrationConfig("shopify", "webhookSecret");
    hmacValid = verifyShopifyHmac(rawBody, hmac, webhookSecret);
  } catch {
    hmacValid = false;
  }

  let payload: ShopifyFulfillmentWebhook;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("Shopify webhook: invalid JSON body");
    return Response.json({ status: "error" }, { status: 200 });
  }

  const shopifyOrderId = String(payload.order_id);

  // Log raw webhook
  await loggerService.logShopifyWebhook({
    topic,
    shopifyOrderId,
    payload,
    hmacValid,
    idempotencyKey: webhookId || undefined,
  });

  if (!hmacValid) {
    console.error("Shopify webhook: invalid HMAC");
    return Response.json({ status: "hmac_invalid" }, { status: 200 });
  }

  // Idempotency check
  if (webhookId) {
    const existing = await db.shopifyWebhookLog.findUnique({
      where: { idempotencyKey: webhookId },
    });
    if (existing?.processed) {
      return Response.json({ status: "already_processed" }, { status: 200 });
    }
  }

  // Find checkout by Shopify order ID
  const checkout = await db.checkout.findUnique({
    where: { shopifyOrderId },
    include: { customer: true },
  });

  if (!checkout) {
    console.error(`Shopify webhook: checkout not found for order ${shopifyOrderId}`);
    return Response.json({ status: "checkout_not_found" }, { status: 200 });
  }

  // Extract tracking info
  const trackingNumber =
    payload.tracking_number ?? payload.tracking_numbers?.[0] ?? null;
  const courierName = payload.tracking_company ?? null;
  const trackingUrl =
    payload.tracking_url ?? payload.tracking_urls?.[0] ?? null;

  // Determine new status
  const hasTracking = !!trackingNumber;
  const newStatus = hasTracking ? "TRACKING_ADDED" : "FULFILLMENT_PENDING";

  // Update checkout
  await db.checkout.update({
    where: { id: checkout.id },
    data: {
      trackingNumber,
      courierName,
      trackingUrl,
      orderStatus: newStatus,
    },
  });

  // Send WhatsApp tracking notification if we have tracking info
  if (hasTracking && checkout.customer) {
    const messageResult = await whatsappService.sendTrackingInfo({
      phone: checkout.customer.phone,
      customerName: checkout.customer.fullName,
      orderRef: checkout.internalOrderReference,
      trackingNumber: trackingNumber!,
      courierName: courierName ?? "Courier",
      trackingUrl: trackingUrl ?? "",
    });

    if (messageResult.success) {
      await db.checkout.update({
        where: { id: checkout.id },
        data: { orderStatus: "CUSTOMER_NOTIFIED" },
      });
    }
  }

  // Mark webhook as processed
  if (webhookId) {
    await db.shopifyWebhookLog.updateMany({
      where: { idempotencyKey: webhookId },
      data: { processed: true },
    });
  }

  return Response.json({ status: "ok" }, { status: 200 });
}

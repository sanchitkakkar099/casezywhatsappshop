import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { config, getIntegrationConfig } from "@/lib/config";
import { DEFAULT_TEMPLATES } from "@/lib/integration-keys";
import { loggerService } from "@/services/logger.service";

/**
 * GET /api/cron/abandoned-cart
 *
 * Finds checkouts with PENDING payment status that are older than 1 hour
 * and sends a reminder WhatsApp message. Sends up to 3 reminders:
 *   - 1st reminder: 1 hour after checkout
 *   - 2nd reminder: 6 hours after checkout
 *   - 3rd reminder: 24 hours after checkout
 *
 * Call this endpoint every 15 minutes via cron.
 */
export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  const apiKey = request.nextUrl.searchParams.get("key");
  const secret = process.env.CRON_SECRET ?? config.whatsappIntakeApiKey;

  const token = authHeader?.replace("Bearer ", "") ?? apiKey;
  if (token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Find abandoned checkouts (pending payment, created 1h+ ago, not older than 2 days)
  const abandonedCheckouts = await db.checkout.findMany({
    where: {
      paymentStatus: "PENDING",
      orderStatus: { in: ["CHECKOUT_CREATED", "PAYMENT_LINK_SENT"] },
      createdAt: { lte: oneHourAgo, gte: twoDaysAgo },
    },
    include: {
      customer: true,
      product: true,
      abandonedCartReminders: true,
    },
  });

  // Get ChatMint config
  let apiUrl: string, chatmintApiKey: string, senderNumber: string, templateName: string;
  try { apiUrl = await getIntegrationConfig("chatmint", "apiUrl"); } catch { apiUrl = process.env.CHATMINT_API_URL ?? "https://backend.chatmint.in/api"; }
  try { chatmintApiKey = await getIntegrationConfig("chatmint", "apiKey"); } catch { chatmintApiKey = process.env.CHATMINT_API_KEY ?? ""; }
  try { senderNumber = await getIntegrationConfig("chatmint", "senderNumber"); } catch { senderNumber = process.env.CHATMINT_SENDER_NUMBER ?? ""; }
  try { templateName = await getIntegrationConfig("chatmint", "tplAbandonedCart"); } catch { templateName = "abandoned_cart"; }

  let sent = 0;
  let skipped = 0;

  for (const checkout of abandonedCheckouts) {
    const existingReminders = checkout.abandonedCartReminders;
    const checkoutAge = now.getTime() - new Date(checkout.createdAt).getTime();

    // Determine which reminder to send
    let reminderNumber: number | null = null;
    if (existingReminders.length === 0 && checkoutAge >= 60 * 60 * 1000) {
      reminderNumber = 1; // 1 hour
    } else if (
      existingReminders.length === 1 &&
      checkoutAge >= 6 * 60 * 60 * 1000
    ) {
      reminderNumber = 2; // 6 hours
    } else if (
      existingReminders.length === 2 &&
      checkoutAge >= 24 * 60 * 60 * 1000
    ) {
      reminderNumber = 3; // 24 hours
    }

    if (!reminderNumber) {
      skipped++;
      continue;
    }

    // Check if this reminder was already sent
    const alreadySent = existingReminders.some(
      (r) => r.reminderNumber === reminderNumber
    );
    if (alreadySent) {
      skipped++;
      continue;
    }

    // Send reminder
    const paymentLink =
      checkout.cashfreePaymentLinkUrl ?? `${config.appUrl}/pay/${checkout.checkoutId}`;

    const payload = {
      sender: senderNumber,
      recipient: checkout.customer.phone,
      template_name: templateName,
      template_params: [
        checkout.customer.fullName,
        checkout.product.name,
        `₹${checkout.totalAmount}`,
        paymentLink,
      ],
    };

    try {
      const response = await fetch(`${apiUrl}/send-template`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${chatmintApiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      await db.abandonedCartReminder.create({
        data: {
          checkoutId: checkout.id,
          phone: checkout.customer.phone,
          reminderNumber,
          status: response.ok ? "sent" : "failed",
          messageId: response.ok ? (data.message_id ?? data.id) : null,
          error: response.ok ? null : (data.message ?? "Failed"),
          sentAt: response.ok ? new Date() : null,
        },
      });

      await loggerService.logWhatsappOutbound({
        recipient: checkout.customer.phone,
        messageType: `abandoned_cart_reminder_${reminderNumber}`,
        payload: { request: payload, response: data },
        status: response.ok ? "sent" : "failed",
        error: response.ok ? undefined : (data.message ?? "Failed"),
        checkoutId: checkout.id,
      });

      if (response.ok) sent++;

      // Rate limit
      await new Promise((r) => setTimeout(r, 100));
    } catch (error) {
      await db.abandonedCartReminder.create({
        data: {
          checkoutId: checkout.id,
          phone: checkout.customer.phone,
          reminderNumber,
          status: "failed",
          error: error instanceof Error ? error.message : "Network error",
        },
      });
    }
  }

  return Response.json({
    status: "ok",
    processed: abandonedCheckouts.length,
    sent,
    skipped,
    timestamp: now.toISOString(),
  });
}

import { db } from "@/lib/db";
import { createShopifyOrder } from "./shopify.service";
import { whatsappService } from "./whatsapp.service";
import { loggerService } from "./logger.service";
import type { Checkout, Customer, Product } from "@prisma/client";

const MAX_ATTEMPTS = 5;

// Exponential backoff: 1m, 5m, 30m, 2h, 12h
const RETRY_DELAYS_MS = [
  60_000,
  300_000,
  1_800_000,
  7_200_000,
  43_200_000,
];

/**
 * Enqueue a Shopify sync job for a checkout.
 * Called after payment success.
 */
export async function enqueueShopifySync(checkoutId: string) {
  return db.shopifySyncJob.create({
    data: {
      checkoutId,
      status: "PENDING",
      attempts: 0,
    },
  });
}

/**
 * Process a single Shopify sync job.
 * Creates the order in Shopify and updates local state.
 */
export async function processShopifySyncJob(jobId: string) {
  const job = await db.shopifySyncJob.findUnique({
    where: { id: jobId },
    include: {
      checkout: {
        include: { customer: true, product: true },
      },
    },
  });

  if (!job) {
    console.error(`Shopify sync job not found: ${jobId}`);
    return;
  }

  // Skip if already completed or if checkout already has a Shopify order
  if (job.status === "COMPLETED" || job.checkout.shopifyOrderId) {
    return;
  }

  // Mark as processing
  await db.shopifySyncJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING", attempts: job.attempts + 1 },
  });

  try {
    const shopifyResponse = await createShopifyOrder(
      job.checkout as Checkout & { customer: Customer; product: Product }
    );

    const shopifyOrderId = String(shopifyResponse.order.id);
    const shopifyOrderNumber = shopifyResponse.order.name;

    // Update checkout with Shopify data
    await db.checkout.update({
      where: { id: job.checkout.id },
      data: {
        shopifyOrderId,
        shopifyOrderNumber,
        orderStatus: "SHOPIFY_ORDER_CREATED",
      },
    });

    // Mark job as completed
    await db.shopifySyncJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Log success
    await loggerService.logShopifySync({
      checkoutId: job.checkout.id,
      action: job.attempts > 0 ? "retry" : "create_order",
      success: true,
      shopifyOrderId,
      response: shopifyResponse,
    });

    // Send payment confirmation via WhatsApp (non-blocking)
    await whatsappService.sendPaymentConfirmation({
      phone: job.checkout.customer.phone,
      customerName: job.checkout.customer.fullName,
      orderRef: job.checkout.internalOrderReference,
      amount: `₹${job.checkout.totalAmount}`,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const attempts = job.attempts + 1;

    // Log failure
    await loggerService.logShopifySync({
      checkoutId: job.checkout.id,
      action: job.attempts > 0 ? "retry" : "create_order",
      success: false,
      error: errorMessage,
    });

    if (attempts >= MAX_ATTEMPTS) {
      // Max attempts reached — mark as failed
      await db.shopifySyncJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          lastError: errorMessage,
        },
      });

      await db.checkout.update({
        where: { id: job.checkout.id },
        data: { orderStatus: "SHOPIFY_SYNC_FAILED" },
      });
    } else {
      // Schedule retry with exponential backoff
      const delay = RETRY_DELAYS_MS[attempts - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      await db.shopifySyncJob.update({
        where: { id: jobId },
        data: {
          status: "PENDING",
          lastError: errorMessage,
          nextRetryAt: new Date(Date.now() + delay),
        },
      });
    }
  }
}

/**
 * Process all pending sync jobs that are due for retry.
 * Called from a cron/scheduled endpoint.
 */
export async function processPendingSyncJobs() {
  const pendingJobs = await db.shopifySyncJob.findMany({
    where: {
      status: "PENDING",
      OR: [
        { nextRetryAt: null },
        { nextRetryAt: { lte: new Date() } },
      ],
    },
    take: 10,
    orderBy: { createdAt: "asc" },
  });

  for (const job of pendingJobs) {
    await processShopifySyncJob(job.id);
  }

  return pendingJobs.length;
}

/**
 * Manually retry a failed sync job from admin dashboard.
 * Creates a new job for the checkout.
 */
export async function retryShopifySync(checkoutId: string) {
  const checkout = await db.checkout.findUnique({
    where: { id: checkoutId },
  });

  if (!checkout) {
    throw new Error(`Checkout not found: ${checkoutId}`);
  }

  if (checkout.shopifyOrderId) {
    throw new Error("Shopify order already exists for this checkout");
  }

  // Create a new sync job
  const job = await db.shopifySyncJob.create({
    data: {
      checkoutId,
      status: "PENDING",
      attempts: 0,
    },
  });

  // Process immediately
  await processShopifySyncJob(job.id);

  // Return updated checkout
  return db.checkout.findUnique({
    where: { id: checkoutId },
    include: { customer: true, product: true, syncJobs: true },
  });
}

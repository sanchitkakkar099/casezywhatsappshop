import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { generateCheckoutId, generateOrderReference } from "@/lib/id";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createPaymentLink } from "./cashfree.service";
import { sendPaymentLinkMessage } from "./whatsapp.service";
import { loggerService } from "./logger.service";
import type { CheckoutIntakeInput } from "@/lib/validation/checkout";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Creates a complete checkout from WhatsApp intake data.
 *
 * Steps:
 * 1. Validate product exists and is active
 * 2. Upsert customer by phone
 * 3. Create checkout record
 * 4. Create Cashfree payment link
 * 5. Update checkout with payment link
 * 6. Send payment link via WhatsApp
 * 7. Update order status
 */
export async function createCheckoutFromIntake(input: CheckoutIntakeInput) {
  // 1. Find product
  const product = await db.product.findUnique({
    where: { id: input.product_id },
  });

  if (!product) {
    throw new NotFoundError("Product", input.product_id);
  }

  if (!product.active) {
    throw new ValidationError("Product is not active");
  }

  // 2. Upsert customer by phone (phone is the WhatsApp identifier)
  const customer = await db.customer.upsert({
    where: { phone: input.phone },
    update: {
      fullName: input.full_name,
      email: input.email,
    },
    create: {
      fullName: input.full_name,
      email: input.email,
      phone: input.phone,
    },
  });

  // 3. Create checkout
  const checkoutId = generateCheckoutId();
  const orderRef = generateOrderReference();
  const unitPrice = product.price;
  const totalAmount = new Decimal(product.price.toString()).mul(input.quantity);

  const checkout = await db.checkout.create({
    data: {
      checkoutId,
      internalOrderReference: orderRef,
      customerId: customer.id,
      productId: product.id,
      quantity: input.quantity,
      unitPrice,
      totalAmount,
      currency: product.currency,
      source: "whatsapp",
      whatsappContactId: input.whatsapp_contact_id,
      shippingAddress: input.shipping_address,
      billingAddress: input.billing_address,
      paymentStatus: "PENDING",
      orderStatus: "CHECKOUT_CREATED",
    },
    include: {
      product: true,
      customer: true,
    },
  });

  // 4. Create Cashfree payment link
  let paymentLinkUrl: string;
  try {
    const cashfreeLink = await createPaymentLink({
      linkId: orderRef,
      amount: totalAmount.toNumber(),
      currency: product.currency,
      purpose: `Payment for ${product.name}`,
      customerName: customer.fullName,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      returnUrl: `${config.appUrl}/payment/thank-you?ref=${orderRef}`,
      notifyUrl: `${config.appUrl}/api/webhooks/cashfree`,
    });

    paymentLinkUrl = cashfreeLink.link_url;

    // 5. Update checkout with Cashfree link details
    await db.checkout.update({
      where: { id: checkout.id },
      data: {
        cashfreeOrderId: orderRef,
        cashfreePaymentLinkId: String(cashfreeLink.cf_link_id),
        cashfreePaymentLinkUrl: cashfreeLink.link_url,
      },
    });
  } catch (error) {
    // Payment link creation failed — checkout still exists as CHECKOUT_CREATED
    console.error("Failed to create Cashfree payment link:", error);

    await loggerService.logAudit({
      actor: "system",
      action: "cashfree.link_creation_failed",
      entity: "checkout",
      entityId: checkout.id,
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Return checkout without payment link — admin can investigate
    return {
      checkout_id: checkout.checkoutId,
      order_reference: checkout.internalOrderReference,
      payment_link: null,
      payment_link_error: error instanceof Error ? error.message : "Failed to create payment link",
      status: "CHECKOUT_CREATED",
    };
  }

  // 6. Send WhatsApp payment link message (non-blocking — don't fail checkout if message fails)
  const messageResult = await sendPaymentLinkMessage(
    customer.phone,
    customer.fullName,
    product.name,
    paymentLinkUrl,
    `₹${totalAmount.toFixed(2)}`,
    checkout.id
  );

  // 7. Update order status
  const newStatus = messageResult.success ? "PAYMENT_LINK_SENT" : "CHECKOUT_CREATED";
  await db.checkout.update({
    where: { id: checkout.id },
    data: { orderStatus: newStatus },
  });

  return {
    checkout_id: checkout.checkoutId,
    order_reference: checkout.internalOrderReference,
    payment_link: paymentLinkUrl,
    message_sent: messageResult.success,
    status: newStatus,
  };
}

/**
 * Get checkout by various identifiers.
 */
export async function getCheckoutByOrderRef(orderRef: string) {
  return db.checkout.findUnique({
    where: { internalOrderReference: orderRef },
    include: { customer: true, product: true, syncJobs: true },
  });
}

export async function getCheckoutByCashfreeOrderId(cashfreeOrderId: string) {
  return db.checkout.findUnique({
    where: { cashfreeOrderId },
    include: { customer: true, product: true },
  });
}

export async function getCheckoutByShopifyOrderId(shopifyOrderId: string) {
  return db.checkout.findUnique({
    where: { shopifyOrderId },
    include: { customer: true, product: true },
  });
}

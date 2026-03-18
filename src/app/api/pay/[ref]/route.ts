import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/pay/:ref
 *
 * Returns checkout + payment session info for the payment page.
 */
export async function GET(
  _request: Request,
  { params }: { params: { ref: string } }
) {
  try {
    const checkout = await db.checkout.findUnique({
      where: { internalOrderReference: params.ref },
      include: { product: true, customer: true },
    });

    if (!checkout) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    if (checkout.paymentStatus === "SUCCESS") {
      return Response.json({
        status: "already_paid",
        orderRef: checkout.internalOrderReference,
        message: "This order has already been paid.",
      });
    }

    return Response.json({
      status: "pending",
      orderRef: checkout.internalOrderReference,
      checkoutId: checkout.checkoutId,
      cashfreeOrderId: checkout.cashfreeOrderId,
      cashfreeSessionId: checkout.cashfreePaymentLinkId,
      amount: checkout.totalAmount,
      currency: checkout.currency,
      customerName: checkout.customer.fullName,
      customerEmail: checkout.customer.email,
      customerPhone: checkout.customer.phone,
      productName: checkout.product.name,
    });
  } catch (error) {
    console.error("Pay API error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

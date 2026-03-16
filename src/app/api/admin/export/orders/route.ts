import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, UnauthorizedError } from "@/lib/errors";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/export/orders
 *
 * Export orders as CSV.
 *
 * Query params:
 * - payment_status (optional filter)
 * - order_status (optional filter)
 * - from (ISO date)
 * - to (ISO date)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const params = request.nextUrl.searchParams;
    const paymentStatus = params.get("payment_status");
    const orderStatus = params.get("order_status");
    const from = params.get("from");
    const to = params.get("to");

    const where: Record<string, unknown> = {};
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (orderStatus) where.orderStatus = orderStatus;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const checkouts = await db.checkout.findMany({
      where,
      include: { customer: true, product: true },
      orderBy: { createdAt: "desc" },
      take: 10000, // Safety limit
    });

    // Build CSV
    const headers = [
      "Checkout ID",
      "Order Reference",
      "Customer Name",
      "Email",
      "Phone",
      "Product",
      "Quantity",
      "Unit Price",
      "Total Amount",
      "Currency",
      "Payment Status",
      "Order Status",
      "Cashfree Order ID",
      "Shopify Order ID",
      "Shopify Order #",
      "Tracking Number",
      "Courier",
      "Tracking URL",
      "Paid At",
      "Created At",
    ];

    const rows = checkouts.map((c) => [
      c.checkoutId,
      c.internalOrderReference,
      c.customer.fullName,
      c.customer.email,
      c.customer.phone,
      c.product.name,
      c.quantity,
      c.unitPrice,
      c.totalAmount,
      c.currency,
      c.paymentStatus,
      c.orderStatus,
      c.cashfreeOrderId ?? "",
      c.shopifyOrderId ?? "",
      c.shopifyOrderNumber ?? "",
      c.trackingNumber ?? "",
      c.courierName ?? "",
      c.trackingUrl ?? "",
      c.paidAt?.toISOString() ?? "",
      c.createdAt.toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const str = String(cell);
            // Escape commas and quotes in CSV
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      ),
    ].join("\n");

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

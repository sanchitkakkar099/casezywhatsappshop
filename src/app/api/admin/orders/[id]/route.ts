import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, UnauthorizedError, NotFoundError } from "@/lib/errors";

/**
 * GET /api/admin/orders/:id
 *
 * Get full order/checkout detail with sync jobs and related logs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const checkout = await db.checkout.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        product: true,
        syncJobs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!checkout) {
      throw new NotFoundError("Order", params.id);
    }

    // Fetch related logs
    const [cashfreeLogs, shopifySyncLogs, whatsappLogs] = await Promise.all([
      db.cashfreeWebhookLog.findMany({
        where: { cashfreeOrderId: checkout.cashfreeOrderId ?? undefined },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.shopifySyncLog.findMany({
        where: { checkoutId: checkout.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.whatsappOutboundLog.findMany({
        where: { checkoutId: checkout.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return Response.json({
      order: checkout,
      logs: {
        cashfree: cashfreeLogs,
        shopifySync: shopifySyncLogs,
        whatsapp: whatsappLogs,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

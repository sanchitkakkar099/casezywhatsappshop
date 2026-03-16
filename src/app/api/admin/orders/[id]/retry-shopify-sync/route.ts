import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse, UnauthorizedError, NotFoundError } from "@/lib/errors";
import { retryShopifySync } from "@/services/shopify-sync.service";
import { loggerService } from "@/services/logger.service";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/orders/:id/retry-shopify-sync
 *
 * Manually retry a failed Shopify order sync.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const result = await retryShopifySync(params.id);

    if (!result) {
      throw new NotFoundError("Checkout", params.id);
    }

    // Log admin action
    await loggerService.logAudit({
      actor: session.user?.email ?? "admin",
      action: "order.retry_shopify_sync",
      entity: "checkout",
      entityId: params.id,
      details: { orderStatus: result.orderStatus },
    });

    return Response.json({ order: result });
  } catch (error) {
    return errorResponse(error);
  }
}

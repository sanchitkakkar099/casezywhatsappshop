import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, UnauthorizedError } from "@/lib/errors";

/**
 * GET /api/admin/logs/webhooks
 *
 * View webhook logs across Cashfree and Shopify.
 *
 * Query params:
 * - type: "cashfree" | "shopify" | "all" (default: "all")
 * - page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const params = request.nextUrl.searchParams;
    const type = params.get("type") ?? "all";
    const page = Math.max(1, parseInt(params.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "30")));
    const skip = (page - 1) * limit;

    const result: Record<string, unknown> = { page, limit };

    if (type === "cashfree" || type === "all") {
      const [cashfreeLogs, cashfreeTotal] = await Promise.all([
        db.cashfreeWebhookLog.findMany({
          orderBy: { createdAt: "desc" },
          skip: type === "cashfree" ? skip : 0,
          take: type === "cashfree" ? limit : 15,
        }),
        db.cashfreeWebhookLog.count(),
      ]);
      result.cashfree = { logs: cashfreeLogs, total: cashfreeTotal };
    }

    if (type === "shopify" || type === "all") {
      const [shopifyLogs, shopifyTotal] = await Promise.all([
        db.shopifyWebhookLog.findMany({
          orderBy: { createdAt: "desc" },
          skip: type === "shopify" ? skip : 0,
          take: type === "shopify" ? limit : 15,
        }),
        db.shopifyWebhookLog.count(),
      ]);
      result.shopify = { logs: shopifyLogs, total: shopifyTotal };
    }

    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

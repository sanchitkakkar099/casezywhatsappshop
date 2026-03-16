import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, UnauthorizedError } from "@/lib/errors";
import { PaymentStatus, OrderStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/orders
 *
 * List orders with pagination, filtering, and search.
 *
 * Query params:
 * - page (default: 1)
 * - limit (default: 20, max: 100)
 * - payment_status (enum)
 * - order_status (enum)
 * - search (searches checkout_id, order_ref, customer name, phone, email)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20")));
    const skip = (page - 1) * limit;

    const paymentStatus = params.get("payment_status") as PaymentStatus | null;
    const orderStatus = params.get("order_status") as OrderStatus | null;
    const search = params.get("search")?.trim();

    // Build where clause
    const where: Record<string, unknown> = {};

    if (paymentStatus && Object.values(PaymentStatus).includes(paymentStatus)) {
      where.paymentStatus = paymentStatus;
    }
    if (orderStatus && Object.values(OrderStatus).includes(orderStatus)) {
      where.orderStatus = orderStatus;
    }

    if (search) {
      where.OR = [
        { checkoutId: { contains: search, mode: "insensitive" } },
        { internalOrderReference: { contains: search, mode: "insensitive" } },
        { shopifyOrderNumber: { contains: search, mode: "insensitive" } },
        { customer: { fullName: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      db.checkout.findMany({
        where,
        include: { customer: true, product: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.checkout.count({ where }),
    ]);

    return Response.json({
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, UnauthorizedError } from "@/lib/errors";

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/customers
 *
 * List customers with order stats, search, and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const params = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "20")));
    const skip = (page - 1) * limit;
    const search = params.get("search")?.trim();
    const segment = params.get("segment"); // "all", "paid", "unpaid", "repeat"

    // Build where clause
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Segment filtering
    if (segment === "paid") {
      where.checkouts = { some: { paymentStatus: "SUCCESS" } };
    } else if (segment === "unpaid") {
      where.checkouts = { every: { paymentStatus: { not: "SUCCESS" } } };
    } else if (segment === "repeat") {
      // Customers with more than 1 successful order
      where.checkouts = { some: { paymentStatus: "SUCCESS" } };
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { checkouts: true } },
          checkouts: {
            select: {
              paymentStatus: true,
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      db.customer.count({ where }),
    ]);

    // Calculate stats per customer
    const enriched = customers.map((c) => {
      const paid = c.checkouts.filter((ch) => ch.paymentStatus === "SUCCESS");
      const totalSpent = paid.reduce(
        (sum, ch) => sum + parseFloat(ch.totalAmount.toString()),
        0
      );
      const lastOrder = c.checkouts[0]?.createdAt ?? null;

      return {
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt,
        totalOrders: c._count.checkouts,
        paidOrders: paid.length,
        totalSpent,
        lastOrderAt: lastOrder,
      };
    });

    // For "repeat" segment, filter to 2+ paid orders
    const filtered =
      segment === "repeat"
        ? enriched.filter((c) => c.paidOrders >= 2)
        : enriched;

    return Response.json({
      customers: filtered,
      total: segment === "repeat" ? filtered.length : total,
      page,
      limit,
      totalPages: Math.ceil(
        (segment === "repeat" ? filtered.length : total) / limit
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

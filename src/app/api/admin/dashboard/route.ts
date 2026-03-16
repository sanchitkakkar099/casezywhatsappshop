import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, UnauthorizedError } from "@/lib/errors";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday as start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/admin/dashboard
 *
 * Returns dashboard metrics, revenue analytics, and WhatsApp stats.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const [
      totalCheckouts,
      pendingPayments,
      successfulPayments,
      failedPayments,
      shopifyOrdersCreated,
      shopifySyncFailed,
      shippedOrders,
      recentCheckouts,
      // Revenue
      totalRevenue,
      todayOrders,
      todayRevenue,
      weekOrders,
      weekRevenue,
      monthOrders,
      monthRevenue,
      // WhatsApp
      whatsappSent,
      whatsappReceived,
    ] = await Promise.all([
      // Existing metrics
      db.checkout.count(),
      db.checkout.count({ where: { paymentStatus: "PENDING" } }),
      db.checkout.count({ where: { paymentStatus: "SUCCESS" } }),
      db.checkout.count({ where: { paymentStatus: "FAILED" } }),
      db.checkout.count({ where: { orderStatus: "SHOPIFY_ORDER_CREATED" } }),
      db.checkout.count({ where: { orderStatus: "SHOPIFY_SYNC_FAILED" } }),
      db.checkout.count({
        where: {
          orderStatus: { in: ["SHIPPED", "TRACKING_ADDED", "CUSTOMER_NOTIFIED"] },
        },
      }),
      db.checkout.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { customer: true, product: true },
      }),
      // Revenue aggregates
      db.checkout.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: "SUCCESS" },
      }),
      db.checkout.count({
        where: { paymentStatus: "SUCCESS", paidAt: { gte: todayStart } },
      }),
      db.checkout.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: "SUCCESS", paidAt: { gte: todayStart } },
      }),
      db.checkout.count({
        where: { paymentStatus: "SUCCESS", paidAt: { gte: weekStart } },
      }),
      db.checkout.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: "SUCCESS", paidAt: { gte: weekStart } },
      }),
      db.checkout.count({
        where: { paymentStatus: "SUCCESS", paidAt: { gte: monthStart } },
      }),
      db.checkout.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: "SUCCESS", paidAt: { gte: monthStart } },
      }),
      // WhatsApp
      db.whatsappOutboundLog.count(),
      db.whatsappInboundLog.count(),
    ]);

    // Additional stats (non-blocking)
    const [abandonedCarts, totalCustomers, cartRecoveries] = await Promise.all([
      db.checkout.count({
        where: {
          paymentStatus: "PENDING",
          orderStatus: { in: ["CHECKOUT_CREATED", "PAYMENT_LINK_SENT"] },
          createdAt: { lte: new Date(now.getTime() - 60 * 60 * 1000) },
        },
      }),
      db.customer.count(),
      db.abandonedCartReminder.count({ where: { status: "sent" } }),
    ]);

    return Response.json({
      metrics: {
        totalCheckouts,
        pendingPayments,
        successfulPayments,
        failedPayments,
        shopifyOrdersCreated,
        shopifySyncFailed,
        shippedOrders,
      },
      revenue: {
        total: totalRevenue._sum.totalAmount?.toNumber() ?? 0,
        today: {
          orders: todayOrders,
          revenue: todayRevenue._sum.totalAmount?.toNumber() ?? 0,
        },
        week: {
          orders: weekOrders,
          revenue: weekRevenue._sum.totalAmount?.toNumber() ?? 0,
        },
        month: {
          orders: monthOrders,
          revenue: monthRevenue._sum.totalAmount?.toNumber() ?? 0,
        },
      },
      whatsapp: {
        sent: whatsappSent,
        received: whatsappReceived,
      },
      marketing: {
        totalCustomers,
        abandonedCarts,
        cartRecoveries,
      },
      recentCheckouts,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
